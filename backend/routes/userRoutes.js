import express from "express";
import {
  registerUser,
  authUser,
  allUsers,
  updateProfile,
} from "../controllers/userControllers.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/").post(registerUser).get(protect, allUsers);
router.post("/login", authUser);
router.route("/profile").put(protect, updateProfile);

export default router;
