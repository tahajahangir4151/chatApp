import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";
import {
  allMessages,
  sendMessage,
  reactMessage,
  markMessagesSeen,
  markMessagesDelivered,
  uploadFile,
} from "../controllers/messageControllers.js";

const router = express.Router();

router.route("/").post(protect, sendMessage);
router.route("/upload").post(protect, upload.single("file"), uploadFile);
router.route("/read/:chatId").put(protect, markMessagesSeen);
router.route("/delivered/:chatId").put(protect, markMessagesDelivered);
router.route("/:messageId/react").put(protect, reactMessage);
router.route("/:chatId").get(protect, allMessages);

export default router;
