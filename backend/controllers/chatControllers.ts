import type { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Chat, { type IChat } from "../models/chatModel";
import User from "../models/userModel";
import Message from "../models/messageModel";

export const accessChat = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401);
    throw new Error("Unauthorized");
  }

  const { userId } = req.body;

  if (!userId) {
    res.status(400).send("User Id param not sent with request");
    return;
  }

  let isChat: any = await Chat.find({
    isGroupChat: false,
    $and: [
      { users: { $elemMatch: { $eq: req.user._id } } },
      { users: { $elemMatch: { $eq: userId } } },
    ],
  })
    .populate("users", "-password")
    .populate("latestMessage");

  isChat = await User.populate(isChat, {
    path: "latestMessage.sender",
    select: "name pic email",
  });

  if (isChat.length > 0) {
    res.send(isChat[0]);
  } else {
    const chatData = {
      chatName: "sender",
      isGroupChat: false,
      users: [req.user._id, userId],
    };
    try {
      const createChat = await Chat.create(chatData);

      const fullChat = await Chat.findOne({ _id: createChat._id }).populate(
        "users",
        "-password"
      );

      res.status(200).send(fullChat);
    } catch (error: any) {
      res.status(400);
      throw new Error(error.message);
    }
  }
});

export const fetchAllChats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401);
    throw new Error("Unauthorized");
  }

  try {
    let results: any = await Chat.find({
      users: { $elemMatch: { $eq: req.user._id } },
    })
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .populate("latestMessage")
      .sort({ updatedAt: -1 });

    results = await User.populate(results, {
      path: "latestMessage.sender",
      select: "name pic email",
    });

    res.status(200).send(results);
  } catch (error: any) {
    res.status(400);
    throw new Error(error.message);
  }
});

export const createGroupChat = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401);
    throw new Error("Unauthorized");
  }

  if (!req.body.users || !req.body.name) {
    res.status(400).send({ message: "Please Fill all the fields" });
    return;
  }

  let users: any[];
  try {
    users = typeof req.body.users === "string" ? JSON.parse(req.body.users) : req.body.users;
  } catch (e) {
    res.status(400).send({ message: "Invalid users format" });
    return;
  }

  if (users.length < 2) {
    res
      .status(400)
      .send({ message: "More than 2 users are required to form a group chat" });
    return;
  }
  users.push(req.user._id);

  try {
    const groupChat = await Chat.create({
      chatName: req.body.name,
      description: req.body.description || "",
      users: users,
      isGroupChat: true,
      groupAdmin: req.user._id,
    });

    const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
      .populate("users", "-password")
      .populate("groupAdmin", "-password");

    res.status(200).send(fullGroupChat);
  } catch (error: any) {
    res.status(400);
    throw new Error(error.message);
  }
});

export const renameGroup = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { chatId, chatName } = req.body;

  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    {
      chatName,
    },
    {
      new: true,
    }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  if (!updatedChat) {
    res.status(404);
    throw new Error("Chat not found");
  } else {
    res.json(updatedChat);
  }
});

export const addUserToGroup = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { chatId, userId } = req.body;

  const added = await Chat.findByIdAndUpdate(
    chatId,
    {
      $push: { users: userId },
    },
    {
      new: true,
    }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  if (!added) {
    res.status(404);
    throw new Error("Chat not found");
  } else {
    res.json(added);
  }
});

export const removeFromGroup = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { chatId, userId } = req.body;

  const removed = await Chat.findByIdAndUpdate(
    chatId,
    {
      $pull: { users: userId },
    },
    {
      new: true,
    }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  if (!removed) {
    res.status(404);
    throw new Error("Chat Not Found");
  } else {
    res.json(removed);
  }
});

export const togglePinChat = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401);
    throw new Error("Unauthorized");
  }

  const { chatId } = req.body;
  const chat = await Chat.findById(chatId);
  if (!chat) {
    res.status(404);
    throw new Error("Chat not found");
  }

  const isPinned = chat.pinnedBy?.some((id) => id.toString() === req.user!._id.toString());
  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    isPinned
      ? { $pull: { pinnedBy: req.user._id } }
      : { $addToSet: { pinnedBy: req.user._id } },
    { new: true }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password")
    .populate("latestMessage");

  res.json(updatedChat);
});

export const toggleMuteChat = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401);
    throw new Error("Unauthorized");
  }

  const { chatId } = req.body;
  const chat = await Chat.findById(chatId);
  if (!chat) {
    res.status(404);
    throw new Error("Chat not found");
  }

  const isMuted = chat.mutedBy?.some((id) => id.toString() === req.user!._id.toString());
  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    isMuted
      ? { $pull: { mutedBy: req.user._id } }
      : { $addToSet: { mutedBy: req.user._id } },
    { new: true }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password")
    .populate("latestMessage");

  res.json(updatedChat);
});

export const toggleFavoriteChat = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401);
    throw new Error("Unauthorized");
  }

  const { chatId } = req.body;
  const chat = await Chat.findById(chatId);
  if (!chat) {
    res.status(404);
    throw new Error("Chat not found");
  }

  const isFavorite = chat.favorites?.some((id) => id.toString() === req.user!._id.toString());
  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    isFavorite
      ? { $pull: { favorites: req.user._id } }
      : { $addToSet: { favorites: req.user._id } },
    { new: true }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password")
    .populate("latestMessage");

  res.json(updatedChat);
});

export const clearChatMessages = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401);
    throw new Error("Unauthorized");
  }

  const { chatId } = req.params;

  await Message.updateMany(
    { chat: chatId },
    { $addToSet: { deletedFor: req.user._id } }
  );

  res.json({ success: true, message: "Chat messages cleared" });
});

