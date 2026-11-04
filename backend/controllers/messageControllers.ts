import type { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Chat from "../models/chatModel";
import User from "../models/userModel";
import Message from "../models/messageModel";

export const allMessages = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401);
    throw new Error("Unauthorized");
  }

  try {
    await Message.updateMany(
      {
        chat: req.params.chatId,
        sender: { $ne: req.user._id },
        readBy: { $ne: req.user._id },
      },
      {
        $addToSet: { readBy: req.user._id, deliveredTo: req.user._id },
        $set: { status: "seen" },
      }
    );

    const messages = await Message.find({
      chat: req.params.chatId,
      deletedFor: { $ne: req.user._id },
    })
      .populate("sender", "name pic email")
      .populate("chat")
      .populate("reactions.user", "name pic")
      .populate({
        path: "replyTo",
        populate: {
          path: "sender",
          select: "name pic",
        },
      });

    res.json(messages);
  } catch (error: any) {
    res.status(400);
    throw new Error(error.message);
  }
});

export const sendMessage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401);
    throw new Error("Unauthorized");
  }

  const {
    content,
    chatId,
    mediaType,
    fileUrl,
    fileName,
    fileSize,
    audioDuration,
    replyTo,
  } = req.body;

  if ((!content && !fileUrl) || !chatId) {
    res.status(400).json({ message: "Invalid data passed into request" });
    return;
  }

  let determinedMediaType: "text" | "image" | "video" | "audio" | "file" = mediaType || "text";
  if (fileUrl && (!mediaType || mediaType === "text")) {
    if (fileUrl.match(/\.(mp4|webm|ogg|mov|mkv)$/i)) {
      determinedMediaType = "video";
    } else if (fileUrl.match(/\.(mp3|wav|ogg|m4a|aac)$/i)) {
      determinedMediaType = "audio";
    } else if (fileUrl.match(/\.(pdf|doc|docx|txt|zip|xls|xlsx)$/i)) {
      determinedMediaType = "file";
    } else {
      determinedMediaType = "image";
    }
  }

  const newMessage = {
    sender: req.user._id,
    content: content ? content.trim() : "",
    chat: chatId,
    mediaType: determinedMediaType,
    fileUrl: fileUrl || "",
    fileName: fileName || "",
    fileSize: fileSize || 0,
    audioDuration:
      Number.isFinite(Number(audioDuration)) && Number(audioDuration) > 0
        ? Number(audioDuration)
        : 0,
    replyTo: replyTo || null,
    status: "sent" as const,
    readBy: [req.user._id],
    deliveredTo: [req.user._id],
    reactions: [],
  };

  try {
    let message: any = await Message.create(newMessage);
    message = await message.populate("sender", "name pic");
    message = await message.populate("chat");
    message = await message.populate("reactions.user", "name pic");
    if (replyTo) {
      message = await message.populate({
        path: "replyTo",
        populate: {
          path: "sender",
          select: "name pic",
        },
      });
    }
    message = await User.populate(message, {
      path: "chat.users",
      select: "name pic email",
    });

    await Chat.findByIdAndUpdate(chatId, { latestMessage: message });

    res.json(message);
  } catch (error: any) {
    res.status(400);
    throw new Error(error.message);
  }
});

export const reactMessage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401);
    throw new Error("Unauthorized");
  }

  const { emoji } = req.body;
  const { messageId } = req.params;

  if (!emoji) {
    res.status(400).json({ message: "Emoji is required" });
    return;
  }

  try {
    const message = await Message.findById(messageId);
    if (!message) {
      res.status(404).json({ message: "Message not found" });
      return;
    }

    const existingIndex = message.reactions.findIndex(
      (r) => r.user.toString() === req.user!._id.toString()
    );

    if (existingIndex !== -1) {
      if (message.reactions[existingIndex].emoji === emoji) {
        message.reactions.splice(existingIndex, 1);
      } else {
        message.reactions[existingIndex].emoji = emoji;
      }
    } else {
      message.reactions.push({
        user: req.user._id,
        emoji,
      });
    }

    await message.save();

    const updatedMessage = await Message.findById(messageId)
      .populate("sender", "name pic email")
      .populate("chat")
      .populate("reactions.user", "name pic")
      .populate({
        path: "replyTo",
        populate: {
          path: "sender",
          select: "name pic",
        },
      });

    res.json(updatedMessage);
  } catch (error: any) {
    res.status(400);
    throw new Error(error.message);
  }
});

export const markMessagesSeen = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401);
    throw new Error("Unauthorized");
  }

  const { chatId } = req.params;

  try {
    await Message.updateMany(
      {
        chat: chatId,
        sender: { $ne: req.user._id },
        readBy: { $ne: req.user._id },
      },
      {
        $addToSet: { readBy: req.user._id, deliveredTo: req.user._id },
        $set: { status: "seen" },
      }
    );

    res.json({ success: true, message: "Messages marked as seen" });
  } catch (error: any) {
    res.status(400);
    throw new Error(error.message);
  }
});

export const markMessagesDelivered = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401);
    throw new Error("Unauthorized");
  }

  const { chatId } = req.params;

  try {
    await Message.updateMany(
      {
        chat: chatId,
        sender: { $ne: req.user._id },
        deliveredTo: { $ne: req.user._id },
      },
      {
        $addToSet: { deliveredTo: req.user._id },
      }
    );

    res.json({ success: true, message: "Messages marked as delivered" });
  } catch (error: any) {
    res.status(400);
    throw new Error(error.message);
  }
});

export const uploadFile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ message: "No file uploaded" });
    return;
  }

  let mediaType: "text" | "image" | "video" | "audio" | "file" = "file";
  const mime = req.file.mimetype;

  if (mime.startsWith("image/")) {
    mediaType = "image";
  } else if (mime.startsWith("video/")) {
    mediaType = "video";
  } else if (mime.startsWith("audio/")) {
    mediaType = "audio";
  }

  const fileUrl = `/uploads/${req.file.filename}`;

  res.json({
    fileUrl,
    mediaType,
    fileName: req.file.originalname,
    fileSize: req.file.size,
  });
});

export const deleteMessage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401);
    throw new Error("Unauthorized");
  }

  const { messageId } = req.params;
  const { deleteForEveryone } = req.query;

  try {
    const message = await Message.findById(messageId);
    if (!message) {
      res.status(404).json({ message: "Message not found" });
      return;
    }

    if (
      deleteForEveryone === "true" &&
      message.sender.toString() === req.user._id.toString()
    ) {
      await Message.findByIdAndDelete(messageId);
      res.json({
        success: true,
        messageId,
        deleteForEveryone: true,
        chatId: message.chat,
      });
      return;
    }

    await Message.findByIdAndUpdate(messageId, {
      $addToSet: { deletedFor: req.user._id },
    });

    res.json({ success: true, messageId, deleteForEveryone: false });
  } catch (error: any) {
    res.status(400);
    throw new Error(error.message);
  }
});

export const toggleStarMessage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { messageId } = req.params;

  try {
    const message = await Message.findById(messageId);
    if (!message) {
      res.status(404).json({ message: "Message not found" });
      return;
    }

    message.isStarred = !message.isStarred;
    await message.save();

    res.json({ success: true, isStarred: message.isStarred });
  } catch (error: any) {
    res.status(400);
    throw new Error(error.message);
  }
});

