import jwt from "jsonwebtoken";
import type { Types } from "mongoose";

const generateToken = (_id: string | Types.ObjectId): string => {
  const secret = process.env.JWT_SECRET || "default_jwt_secret_fallback";
  return jwt.sign({ _id: _id.toString() }, secret, {
    expiresIn: "30d",
  });
};

export default generateToken;

