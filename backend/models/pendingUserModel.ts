import mongoose, { Document, Model, Schema } from "mongoose";

export interface IPendingUser extends Document {
  name: string;
  email: string;
  password: string;
  pic?: string;
  otp: string;
  otpExpires: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const pendingUserSchema = new Schema<IPendingUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    pic: {
      type: String,
      default: "",
    },
    otp: {
      type: String,
      required: true,
    },
    otpExpires: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
  },
  {
    timestamps: true,
  }
);

const PendingUser: Model<IPendingUser> = mongoose.model<IPendingUser>("PendingUser", pendingUserSchema);
export default PendingUser;

