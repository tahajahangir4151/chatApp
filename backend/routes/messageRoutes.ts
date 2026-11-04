import express from "express";
import { protect } from "../middleware/authMiddleware";
import upload from "../middleware/uploadMiddleware";
import {
  allMessages,
  sendMessage,
  reactMessage,
  markMessagesSeen,
  markMessagesDelivered,
  uploadFile,
  deleteMessage,
  toggleStarMessage,
} from "../controllers/messageControllers";

const router = express.Router();

router.route("/").post(protect, sendMessage);
router.route("/upload").post(protect, upload.single("file"), uploadFile);
router.route("/read/:chatId").put(protect, markMessagesSeen);
router.route("/delivered/:chatId").put(protect, markMessagesDelivered);
router.route("/:messageId/react").put(protect, reactMessage);
router.route("/:messageId/star").put(protect, toggleStarMessage);
router.route("/:messageId").delete(protect, deleteMessage);
router.route("/:chatId").get(protect, allMessages);

export default router;

