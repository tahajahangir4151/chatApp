import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

export const protect = asyncHandler(async (req, res, next) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    const [, token] = req.headers.authorization.split(" ");
    try {
      const { _id } = jwt.verify(token, process.env.JWT_SECRET);
      // console.log("Decoded user ID:", _id);
      const user = await User.findById(_id);
      // console.log("User found:", user);
      req.user = user;
      next();
    } catch (error) {
      // console.error("JWT verification error:", error);
      res.status(401);
      throw new Error("Unauthorized");
    }
  } else {
    res.status(401);
    throw new Error("Unauthorized");
  }
});
