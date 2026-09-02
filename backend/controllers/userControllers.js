import crypto from "crypto";
import asyncHandler from "express-async-handler";
import User from "../models/userModel.js";
import generateToken from "../config/generateToken.js";
import { sendVerificationEmail } from "../config/emailService.js";

// Register a user with Nodemailer email verification
export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, pic } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please Enter all the Fields");
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error("User already exists");
  }

  const verificationToken = crypto.randomBytes(32).toString("hex");
  const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const user = await User.create({
    name,
    email,
    password,
    pic,
    about: "Hey there! I am using Talk-A-Tive.",
    status: "online",
    isVerified: false,
    verificationToken,
    verificationTokenExpires,
  });

  if (user) {
    // Send email verification via Nodemailer
    try {
      await sendVerificationEmail(user.email, user.name, verificationToken);
    } catch (emailErr) {
      console.error("[Email Error] Could not send verification email:", emailErr.message);
    }

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      pic: user.pic,
      about: user.about,
      status: user.status,
      lastSeen: user.lastSeen,
      isVerified: false,
      message: "Registration successful! Please check your email to verify your account.",
    });
  } else {
    res.status(400);
    throw new Error("Failed to Create the user");
  }
});

// Login API with email verification enforcement
export const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    // Enforce email verification (guest user exempt)
    if (user.isVerified === false && user.email !== "guest@gmail.com") {
      return res.status(403).json({
        message: "Your email address is not verified yet. Please check your inbox or resend verification link.",
        needsVerification: true,
        email: user.email,
      });
    }

    // Update lastSeen and status to online
    user.status = "online";
    user.lastSeen = Date.now();
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      pic: user.pic,
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

// Verify email with token
export const verifyEmail = asyncHandler(async (req, res) => {
  const token = req.query.token || req.body.token;

  if (!token) {
    res.status(400);
    throw new Error("Verification token is missing");
  }

  const user = await User.findOne({
    verificationToken: token,
    verificationTokenExpires: { $gt: Date.now() },
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
export const resendVerificationEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error("Email is required");
  }

  const user = await User.findOne({ email });
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (user.isVerified) {
    return res.status(400).json({ message: "This email address is already verified" });
  }

  const verificationToken = crypto.randomBytes(32).toString("hex");
  user.verificationToken = verificationToken;
  user.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();

  await sendVerificationEmail(user.email, user.name, verificationToken);

  res.status(200).json({ message: "Verification email resent successfully" });
});

// Get all users /api/user?search=value
export const allUsers = asyncHandler(async (req, res) => {
  const { search } = req.query;

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

  res.json(users);
});

// Update Profile
export const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.name = req.body.name || user.name;
    user.pic = req.body.pic || user.pic;
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
      pic: updatedUser.pic,
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
