import crypto from "crypto";
import asyncHandler from "express-async-handler";
import Invite from "../models/inviteModel.js";
import Chat from "../models/chatModel.js";
import User from "../models/userModel.js";
import { sendInviteEmail } from "../config/emailService.js";

// @description     Create and send a chat invite via Nodemailer
// @route           POST /api/invite
// @access          Protected
export const createInvite = asyncHandler(async (req, res) => {
  const { recipientEmail, inviteType = "direct", chatId } = req.body;

  if (!recipientEmail) {
    res.status(400);
    throw new Error("Recipient email is required");
  }

  const cleanEmail = recipientEmail.toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    res.status(400);
    throw new Error("Please enter a valid email address");
  }

  if (cleanEmail === req.user.email.toLowerCase()) {
    res.status(400);
    throw new Error("You cannot send an invite to your own email address");
  }

  let chatName = "";
  let targetChat = null;

  if (inviteType === "group") {
    if (!chatId) {
      res.status(400);
      throw new Error("Chat ID is required for group invitations");
    }

    targetChat = await Chat.findById(chatId);
    if (!targetChat) {
      res.status(404);
      throw new Error("Group chat not found");
    }

    if (!targetChat.users.some((u) => u.toString() === req.user._id.toString())) {
      res.status(403);
      throw new Error("You must be a member of the group to send invites");
    }

    chatName = targetChat.chatName;
  }

  const token = crypto.randomBytes(24).toString("hex");

  const invite = await Invite.create({
    token,
    inviter: req.user._id,
    recipientEmail: cleanEmail,
    inviteType,
    chat: targetChat ? targetChat._id : undefined,
    status: "pending",
  });

  // Send the invitation email via Nodemailer
  try {
    await sendInviteEmail({
      recipientEmail: cleanEmail,
      inviterName: req.user.name,
      inviteType,
      chatName,
      token,
    });
  } catch (err) {
    console.error("[Invite Error] Failed sending invite email:", err.message);
  }

  res.status(201).json({
    message: `Invitation sent to ${cleanEmail}!`,
    invite: {
      _id: invite._id,
      token: invite.token,
      recipientEmail: invite.recipientEmail,
      inviteType: invite.inviteType,
      status: invite.status,
    },
  });
});

// @description     Get invite details before accepting
// @route           GET /api/invite/:token
// @access          Public
export const getInviteDetails = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const invite = await Invite.findOne({ token })
    .populate("inviter", "name pic email")
    .populate("chat", "chatName isGroupChat");

  if (!invite) {
    res.status(404);
    throw new Error("Invitation not found or has been revoked");
  }

  if (invite.status === "accepted") {
    return res.status(400).json({
      message: "This invitation has already been accepted",
      alreadyAccepted: true,
    });
  }

  if (new Date(invite.expiresAt) < new Date()) {
    invite.status = "expired";
    await invite.save();
    res.status(400);
    throw new Error("This invitation link has expired");
  }

  const existingUser = await User.findOne({ email: invite.recipientEmail });

  res.status(200).json({
    token: invite.token,
    inviter: invite.inviter,
    inviteType: invite.inviteType,
    chat: invite.chat,
    recipientEmail: invite.recipientEmail,
    hasAccount: Boolean(existingUser),
    expiresAt: invite.expiresAt,
  });
});

// @description     Accept invite and start chat or join group
// @route           POST /api/invite/:token/accept
// @access          Protected
export const acceptInvite = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const invite = await Invite.findOne({ token });

  if (!invite) {
    res.status(404);
    throw new Error("Invitation not found");
  }

  if (invite.status === "accepted") {
    res.status(400);
    throw new Error("This invitation has already been accepted");
  }

  if (new Date(invite.expiresAt) < new Date()) {
    invite.status = "expired";
    await invite.save();
    res.status(400);
    throw new Error("This invitation has expired");
  }

  let resultingChat = null;

  if (invite.inviteType === "direct") {
    // 1-on-1 direct chat
    let isChat = await Chat.findOne({
      isGroupChat: false,
      $and: [
        { users: { $elemMatch: { $eq: req.user._id } } },
        { users: { $elemMatch: { $eq: invite.inviter } } },
      ],
    })
      .populate("users", "-password")
      .populate("latestMessage");

    if (isChat) {
      resultingChat = isChat;
    } else {
      const createdChat = await Chat.create({
        chatName: "sender",
        isGroupChat: false,
        users: [req.user._id, invite.inviter],
      });

      resultingChat = await Chat.findById(createdChat._id).populate(
        "users",
        "-password"
      );
    }
  } else if (invite.inviteType === "group") {
    // Group chat invitation
    const chat = await Chat.findById(invite.chat);

    if (!chat) {
      res.status(404);
      throw new Error("The group chat associated with this invite no longer exists");
    }

    if (!chat.users.includes(req.user._id)) {
      chat.users.push(req.user._id);
      await chat.save();
    }

    resultingChat = await Chat.findById(chat._id)
      .populate("users", "-password")
      .populate("groupAdmin", "-password");
  }

  invite.status = "accepted";
  await invite.save();

  res.status(200).json({
    message: "Invitation accepted successfully!",
    chat: resultingChat,
  });
});
