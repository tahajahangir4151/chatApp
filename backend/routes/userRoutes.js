import express from "express";
import {
  registerUser,
  authUser,
  allUsers,
  updateProfile,
  verifyEmail,
  resendVerificationEmail,
} from "../controllers/userControllers.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/").post(registerUser).get(protect, allUsers);
router.post("/login", authUser);
router.route("/verify-email").get(verifyEmail).post(verifyEmail);
router.post("/resend-verification", resendVerificationEmail);
router.route("/profile").put(protect, updateProfile);

export default router;
