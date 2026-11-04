import mongoose, { Document, Model, Schema, Types } from "mongoose";
import type { IUser } from "./userModel";
import type { IChat } from "./chatModel";

export interface IInvite extends Document {
  token: string;
  inviter: Types.ObjectId | IUser;
  recipientEmail: string;
  inviteType: "direct" | "group";
  chat?: Types.ObjectId | IChat;
  status: "pending" | "accepted" | "expired";
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const inviteSchema = new Schema<IInvite>(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    inviter: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipientEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    inviteType: {
      type: String,
      enum: ["direct", "group"],
      default: "direct",
    },
    chat: {
      type: Schema.Types.ObjectId,
      ref: "Chat",
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "expired"],
      default: "pending",
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  },
  {
    timestamps: true,
  }
);

const Invite: Model<IInvite> = mongoose.model<IInvite>("Invite", inviteSchema);

export default Invite;

