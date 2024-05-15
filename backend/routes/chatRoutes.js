import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  accessChat,
  addUserToGroup,
  createGroupChat,
  fetchAllChats,
  removeFromGroup,
  renameGroup,
} from "../controllers/chatControllers.js";

const router = express.Router();

router.route("/").post(protect, accessChat);
router.route("/").get(protect, fetchAllChats);
router.route("/group").post(protect, createGroupChat);
router.route("/rename").put(protect, renameGroup);
router.route("/groupadd").put(protect, addUserToGroup);
router.route("/groupremove").put(protect, removeFromGroup);

export default router;
