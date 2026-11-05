import express from "express";
import { protect } from "../middleware/authMiddleware";
import {
  accessChat,
  addUserToGroup,
  createGroupChat,
  fetchAllChats,
  removeFromGroup,
  renameGroup,
  togglePinChat,
  toggleMuteChat,
  toggleFavoriteChat,
  clearChatMessages,
  deleteChat,
} from "../controllers/chatControllers";

const router = express.Router();

router.route("/").post(protect, accessChat);
router.route("/").get(protect, fetchAllChats);
router.route("/group").post(protect, createGroupChat);
router.route("/rename").put(protect, renameGroup);
router.route("/groupadd").put(protect, addUserToGroup);
router.route("/groupremove").put(protect, removeFromGroup);
router.route("/pin").put(protect, togglePinChat);
router.route("/mute").put(protect, toggleMuteChat);
router.route("/favorite").put(protect, toggleFavoriteChat);
router.route("/:chatId/clear").delete(protect, clearChatMessages);
router.route("/:chatId").delete(protect, deleteChat);

export default router;

