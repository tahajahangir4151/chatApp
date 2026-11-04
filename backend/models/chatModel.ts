import mongoose, { Document, Model, Schema, Types } from "mongoose";
import type { IUser } from "./userModel";
import type { IMessage } from "./messageModel";

export interface IChat extends Document {
  chatName: string;
  isGroupChat: boolean;
  users: Types.ObjectId[] | IUser[];
  latestMessage?: Types.ObjectId | IMessage;
  groupAdmin?: Types.ObjectId | IUser;
  pinnedBy: Types.ObjectId[];
  mutedBy: Types.ObjectId[];
  favorites: Types.ObjectId[];
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const chatSchema = new Schema<IChat>(
  {
    chatName: {
      type: String,
      trim: true,
    },
    isGroupChat: {
      type: Boolean,
      default: false,
    },
    users: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    latestMessage: {
      type: Schema.Types.ObjectId,
      ref: "Message",
    },
    groupAdmin: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    pinnedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    mutedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    favorites: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    description: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const Chat: Model<IChat> = mongoose.model<IChat>("Chat", chatSchema);

export default Chat;

