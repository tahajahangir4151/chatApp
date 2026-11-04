import mongoose, { Document, Model, Schema, Types } from "mongoose";
import type { IUser } from "./userModel";
import type { IChat } from "./chatModel";

export interface IReaction {
  user: Types.ObjectId | IUser;
  emoji: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IMessage extends Document {
  sender: Types.ObjectId | IUser;
  content: string;
  chat: Types.ObjectId | IChat;
  mediaType: "text" | "image" | "video" | "audio" | "file";
  fileUrl: string;
  fileName: string;
  fileSize: number;
  audioDuration: number;
  replyTo?: Types.ObjectId | IMessage | null;
  isStarred: boolean;
  isPinned: boolean;
  deletedFor: Types.ObjectId[];
  reactions: IReaction[];
  status: "sent" | "delivered" | "seen";
  deliveredTo: Types.ObjectId[];
  readBy: Types.ObjectId[];
  createdAt?: Date;
  updatedAt?: Date;
}

const reactionSchema = new Schema<IReaction>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    emoji: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false, timestamps: true }
);

const messageSchema = new Schema<IMessage>(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      trim: true,
      default: "",
    },
    chat: {
      type: Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    mediaType: {
      type: String,
      enum: ["text", "image", "video", "audio", "file"],
      default: "text",
    },
    fileUrl: {
      type: String,
      default: "",
    },
    fileName: {
      type: String,
      default: "",
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    audioDuration: {
      type: Number,
      default: 0,
      min: 0,
    },
    replyTo: {
      type: Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    isStarred: {
      type: Boolean,
      default: false,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    deletedFor: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    reactions: [reactionSchema],
    status: {
      type: String,
      enum: ["sent", "delivered", "seen"],
      default: "sent",
    },
    deliveredTo: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    readBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Message: Model<IMessage> = mongoose.model<IMessage>("Message", messageSchema);

export default Message;

