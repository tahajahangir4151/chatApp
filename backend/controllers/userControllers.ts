import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import User, { type IUser } from "../models/userModel";
import PendingUser from "../models/pendingUserModel";
import generateToken from "../config/generateToken";
import {
  sendVerificationEmail,
  sendVerificationCodeEmail,
} from "../config/emailService";

export const cleanPic = (p?: string): string => {
  if (!p || typeof p !== "string") return "";
  if (p.includes("icon-library.com")) return "";
  return p;
};

// Step 1: Initiate registration and send 6-digit verification code
export const registerUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, pic } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please enter all required fields");
  }

  const cleanEmail = String(email).toLowerCase().trim();

  const userExists = await User.findOne({ email: cleanEmail });
  if (userExists) {
    res.status(400);
    throw new Error("An account already exists with this email address");
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

  await PendingUser.findOneAndUpdate(
    { email: cleanEmail },
    {
      name: String(name).trim(),
      email: cleanEmail,
      password,
      pic: pic || undefined,
      otp,
      otpExpires,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  try {
    await sendVerificationCodeEmail(cleanEmail, String(name).trim(), otp);
  } catch (emailErr: any) {
    console.error(
      "[Email Error] Could not send verification code email:",
      emailErr.message
    );
  }

  res.status(200).json({
    message: "A 6-digit verification code has been sent to your email.",
    email: cleanEmail,
    requiresOtp: true,
  });
});

// Step 2: Verify 6-digit code and create permanent user account
export const verifyOtp = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    res.status(400);
    throw new Error("Email and 6-digit verification code are required");
  }

  const cleanEmail = String(email).toLowerCase().trim();
  const cleanOtp = String(otp).trim().replace(/\s+/g, "");

  const existingUser = await User.findOne({ email: cleanEmail });
  if (existingUser && existingUser.isVerified) {
    res.status(400).json({
      message: "This account is already verified. Please sign in.",
    });
    return;
  }

  const pending = await PendingUser.findOne({ email: cleanEmail });

  if (!pending) {
    if (existingUser && !existingUser.isVerified) {
      if (existingUser.otpExpires && existingUser.otpExpires.getTime() < Date.now()) {
        res.status(400);
        throw new Error("Verification code has expired. Please request a new one.");
      }
      if (existingUser.otp && existingUser.otp === cleanOtp) {
        existingUser.isVerified = true;
        existingUser.otp = undefined;
        existingUser.otpExpires = undefined;
        await existingUser.save();

        res.status(200).json({
          _id: existingUser._id,
          name: existingUser.name,
          email: existingUser.email,
          pic: existingUser.pic,
          about: existingUser.about,
          status: existingUser.status,
          lastSeen: existingUser.lastSeen,
          isVerified: true,
          token: generateToken(existingUser._id),
          message: "Account verified successfully!",
        });
        return;
      }
    }

    res.status(400);
    throw new Error("No pending registration found for this email. Please sign up again.");
  }

  if (pending.otpExpires.getTime() < Date.now()) {
    res.status(400);
    throw new Error("Verification code has expired. Please request a new code.");
  }

  if (pending.otp !== cleanOtp) {
    res.status(400);
    throw new Error("Invalid 6-digit verification code. Please check and try again.");
  }

  const user = await User.create({
    name: pending.name,
    email: pending.email,
    password: pending.password,
    pic: pending.pic,
    isVerified: true,
    status: "online",
    about: "Hey there! I am using Talk-A-Tive.",
  });

  await PendingUser.deleteOne({ _id: pending._id });

  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    pic: cleanPic(user.pic),
    about: user.about,
    status: user.status,
    lastSeen: user.lastSeen,
    isVerified: true,
    token: generateToken(user._id),
    message: "Account verified and created successfully!",
  });
});

// Resend 6-digit OTP verification code
export const resendOtp = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error("Email is required");
  }

  const cleanEmail = String(email).toLowerCase().trim();

  const existingUser = await User.findOne({ email: cleanEmail });
  if (existingUser && existingUser.isVerified) {
    res.status(400).json({
      message: "This account is already verified. Please sign in.",
    });
    return;
  }

  const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const newOtpExpires = new Date(Date.now() + 10 * 60 * 1000);

  const pending = await PendingUser.findOne({ email: cleanEmail });
  if (pending) {
    pending.otp = newOtp;
    pending.otpExpires = newOtpExpires;
    await pending.save();

    try {
      await sendVerificationCodeEmail(pending.email, pending.name, newOtp);
    } catch (emailErr: any) {
      console.error("[Email Error] Failed to resend verification code:", emailErr.message);
      res.status(500);
      throw new Error(`Failed to send code email: ${emailErr.message}`);
    }

    res.status(200).json({
      message: "A new 6-digit verification code has been sent to your email.",
    });
    return;
  }

  if (existingUser && !existingUser.isVerified) {
    existingUser.otp = newOtp;
    existingUser.otpExpires = newOtpExpires;
    await existingUser.save();

    try {
      await sendVerificationCodeEmail(existingUser.email, existingUser.name, newOtp);
    } catch (emailErr: any) {
      console.error("[Email Error] Failed to resend verification code:", emailErr.message);
      res.status(500);
      throw new Error(`Failed to send code email: ${emailErr.message}`);
    }

    res.status(200).json({
      message: "A new 6-digit verification code has been sent to your email.",
    });
    return;
  }

  res.status(404);
  throw new Error("No pending registration found for this email. Please sign up.");
});

// Login API with email verification enforcement
export const authUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: String(email).toLowerCase().trim() });

  if (user && (await user.matchPassword(password))) {
    if (user.isVerified === false && user.email !== "guest@gmail.com") {
      res.status(403).json({
        message: "Your email address is not verified yet. Please check your inbox or resend verification code.",
        needsVerification: true,
        email: user.email,
      });
      return;
    }

    user.status = "online";
    user.lastSeen = new Date();
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      pic: cleanPic(user.pic),
      about: user.about || "Hey there! I am using Talk-A-Tive.",
      status: user.status || "online",
      lastSeen: user.lastSeen,
      isVerified: user.isVerified !== false,
      token: generateToken(user._id),
    });
  } else {
    res.status(401);
    throw new Error("Invalid Email or Password");
  }
});

// Verify email with token or 6-digit OTP
export const verifyEmail = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const otp = req.query.otp || req.body.otp;
  const email = req.query.email || req.body.email;

  if (otp && email) {
    await (verifyOtp as any)(req, res, next);
    return;
  }

  const token = req.query.token || req.body.token;

  if (!token) {
    res.status(400);
    throw new Error("Verification token or 6-digit code is missing");
  }

  const user = await User.findOne({
    verificationToken: token,
    verificationTokenExpires: { $gt: new Date() },
  });

  if (!user) {
    res.status(400);
    throw new Error("Verification link is invalid or has expired");
  }

  user.isVerified = true;
  user.verificationToken = undefined;
  user.verificationTokenExpires = undefined;
  await user.save();

  res.status(200).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    pic: user.pic,
    about: user.about,
    status: user.status,
    lastSeen: user.lastSeen,
    isVerified: true,
    token: generateToken(user._id),
    message: "Email successfully verified!",
  });
});

// Resend verification email
export const resendVerificationEmail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error("Email is required");
  }

  const user = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (user.isVerified) {
    res.status(400).json({ message: "This email address is already verified" });
    return;
  }

  const verificationToken = crypto.randomBytes(32).toString("hex");
  user.verificationToken = verificationToken;
  user.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();

  try {
    await sendVerificationEmail(user.email, user.name, verificationToken);
    res.status(200).json({ message: "Verification email resent successfully" });
  } catch (emailErr: any) {
    console.error("[Email Error] Could not resend verification email:", emailErr.message);
    res.status(500);
    throw new Error(`Could not send verification email: ${emailErr.message}`);
  }
});

// Get all users /api/user?search=value
export const allUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const search = req.query.search as string | undefined;

  const keyword = search
    ? {
        $or: [
          { name: { $regex: new RegExp(search, "i") } },
          { email: { $regex: new RegExp(search, "i") } },
        ],
      }
    : {};

  let users;
  if (req.user) {
    users = await User.find({ ...keyword, _id: { $ne: req.user._id } }).select(
      "-password"
    );
  } else {
    users = await User.find(keyword).select("-password");
  }

  const cleanedUsers = users.map((u: any) => {
    const doc = u.toObject ? u.toObject() : { ...u };
    doc.pic = cleanPic(doc.pic);
    return doc;
  });

  res.json(cleanedUsers);
});

// Update Profile
export const updateProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401);
    throw new Error("Unauthorized");
  }

  const user = await User.findById(req.user._id);

  if (user) {
    user.name = req.body.name || user.name;
    user.pic = req.body.pic !== undefined ? cleanPic(req.body.pic) : user.pic;
    user.about = req.body.about !== undefined ? req.body.about : user.about;
    user.status = req.body.status || user.status;

    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      pic: cleanPic(updatedUser.pic),
      about: updatedUser.about,
      status: updatedUser.status,
      lastSeen: updatedUser.lastSeen,
      token: generateToken(updatedUser._id),
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});
