import asyncHandler from "express-async-handler";
import Chat from "../models/chatModel.js";
import User from "../models/userModel.js";
import Message from "../models/messageModel.js";

//@description     Get all Messages
//@route           GET /api/Message/:chatId
//@access          Protected
export const allMessages = asyncHandler(async (req, res) => {
  try {
    // Automatically mark unread messages sent by others in this chat as seen
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

    const messages = await Message.find({ chat: req.params.chatId })
      .populate("sender", "name pic email")
      .populate("chat")
      .populate("reactions.user", "name pic");

    res.json(messages);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

//@description     Create New Message
//@route           POST /api/Message/
//@access          Protected
export const sendMessage = asyncHandler(async (req, res) => {
  const { content, chatId, mediaType, fileUrl, fileName, fileSize } = req.body;

  if ((!content && !fileUrl) || !chatId) {
    console.log("Invalid data passed into request");
    return res.status(400).json({ message: "Invalid data passed into request" });
  }

  let determinedMediaType = mediaType || "text";
  if (fileUrl && (!mediaType || mediaType === "text")) {
    determinedMediaType = fileUrl.match(/\.(mp4|webm|ogg|mov|mkv)$/i)
      ? "video"
      : "image";
  }

  const newMessage = {
    sender: req.user._id,
    content: content ? content.trim() : "",
    chat: chatId,
    mediaType: determinedMediaType,
    fileUrl: fileUrl || "",
    fileName: fileName || "",
    fileSize: fileSize || 0,
    status: "sent",
    readBy: [req.user._id],
    deliveredTo: [req.user._id],
    reactions: [],
  };

  try {
    let message = await Message.create(newMessage);

    message = await message.populate("sender", "name pic");
    message = await message.populate("chat");
    message = await message.populate("reactions.user", "name pic");
    message = await User.populate(message, {
      path: "chat.users",
      select: "name pic email",
    });

    await Chat.findByIdAndUpdate(chatId, { latestMessage: message });

    res.json(message);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

//@description     Toggle reaction on a message (WhatsApp style)
//@route           PUT /api/message/:messageId/react
//@access          Protected
export const reactMessage = asyncHandler(async (req, res) => {
  const { emoji } = req.body;
  const { messageId } = req.params;

  if (!emoji) {
    return res.status(400).json({ message: "Emoji is required" });
  }

  try {
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    const existingIndex = message.reactions.findIndex(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (existingIndex !== -1) {
      if (message.reactions[existingIndex].emoji === emoji) {
        // Same emoji clicked: toggle off (remove reaction)
        message.reactions.splice(existingIndex, 1);
      } else {
        // Different emoji clicked: update to new emoji
        message.reactions[existingIndex].emoji = emoji;
      }
    } else {
      // New reaction from user
      message.reactions.push({
        user: req.user._id,
        emoji,
      });
    }

    await message.save();

    const updatedMessage = await Message.findById(messageId)
      .populate("sender", "name pic email")
      .populate("chat")
      .populate("reactions.user", "name pic");

    res.json(updatedMessage);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

//@description     Mark messages in a chat as seen by current user
//@route           PUT /api/message/read/:chatId
//@access          Protected
export const markMessagesSeen = asyncHandler(async (req, res) => {
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
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

//@description     Mark messages in a chat as delivered
//@route           PUT /api/message/delivered/:chatId
//@access          Protected
export const markMessagesDelivered = asyncHandler(async (req, res) => {
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
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

//@description     Upload image or video
//@route           POST /api/message/upload
//@access          Protected
export const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const isVideo = req.file.mimetype.startsWith("video/");
  const mediaType = isVideo ? "video" : "image";
  const fileUrl = `/uploads/${req.file.filename}`;

  res.json({
    fileUrl,
    mediaType,
    fileName: req.file.originalname,
    fileSize: req.file.size,
  });
});
