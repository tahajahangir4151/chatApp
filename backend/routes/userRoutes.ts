import express from "express";
import {
  registerUser,
  authUser,
  allUsers,
  updateProfile,
  verifyEmail,
  verifyOtp,
  resendOtp,
} from "../controllers/userControllers";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();

router.route("/").post(registerUser).get(protect, allUsers);
router.post("/login", authUser);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.route("/verify-email").get(verifyEmail).post(verifyEmail);
router.post("/resend-verification", resendOtp);
router.route("/profile").put(protect, updateProfile);

export default router;

