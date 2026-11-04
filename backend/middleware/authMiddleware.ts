import type { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import User from "../models/userModel";

interface JwtPayloadWithId {
  _id: string;
}

export const protect = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      const [, token] = req.headers.authorization.split(" ");
      try {
        const secret = process.env.JWT_SECRET || "default_jwt_secret_fallback";
        const decoded = jwt.verify(token, secret) as JwtPayloadWithId;
        const user = await User.findById(decoded._id).select("-password");

        if (!user) {
          res.status(401);
          throw new Error("User not found");
        }

        req.user = user;
        next();
      } catch (error) {
        res.status(401);
        throw new Error("Unauthorized");
      }
    } else {
      res.status(401);
      throw new Error("Unauthorized, no token provided");
    }
  }
);

