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
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

//@description     Create New Message
//@route           POST /api/Message/
//@access          Protected
export const sendMessage = asyncHandler(async (req, res) => {
  const { content, chatId, mediaType, fileUrl, fileName, fileSize, replyTo } =
    req.body;

  if ((!content && !fileUrl) || !chatId) {
    console.log("Invalid data passed into request");
    return res.status(400).json({ message: "Invalid data passed into request" });
  }

  let determinedMediaType = mediaType || "text";
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
    replyTo: replyTo || null,
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
      .populate("reactions.user", "name pic")
      .populate({
        path: "replyTo",
        populate: {
          path: "sender",
          select: "name pic",
        },
      });

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

//@description     Upload any media (image, video, audio, file)
//@route           POST /api/message/upload
//@access          Protected
export const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  let mediaType = "file";
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

//@description     Delete a message (soft delete for user)
//@route           DELETE /api/message/:messageId
//@access          Protected
export const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { deleteForEveryone } = req.query;

  try {
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (
      deleteForEveryone === "true" &&
      message.sender.toString() === req.user._id.toString()
    ) {
      await Message.findByIdAndDelete(messageId);
      return res.json({
        success: true,
        messageId,
        deleteForEveryone: true,
        chatId: message.chat,
      });
    }

    // Otherwise delete for me
    await Message.findByIdAndUpdate(messageId, {
      $addToSet: { deletedFor: req.user._id },
    });

    res.json({ success: true, messageId, deleteForEveryone: false });
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

//@description     Star or unstar a message
//@route           PUT /api/message/:messageId/star
//@access          Protected
export const toggleStarMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;

  try {
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    message.isStarred = !message.isStarred;
    await message.save();

    res.json({ success: true, isStarred: message.isStarred });
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});
