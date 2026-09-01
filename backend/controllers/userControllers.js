import asyncHandler from "express-async-handler";
import User from "../models/userModel.js";
import generateToken from "../config/generateToken.js";

// Register a user
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

  const user = await User.create({
    name,
    email,
    password,
    pic,
    about: "Hey there! I am using Talk-A-Tive.",
    status: "online",
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      pic: user.pic,
      about: user.about,
      status: user.status,
      lastSeen: user.lastSeen,
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error("Failed to Create the user");
  }
});

// Login API
export const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
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
      token: generateToken(user._id),
    });
  } else {
    res.status(401);
    throw new Error("Invalid Email or Password");
  }
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
