import express from "express";
import {
  createInvite,
  getInviteDetails,
  acceptInvite,
} from "../controllers/inviteControllers";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();

router.route("/").post(protect, createInvite);
router.route("/:token").get(getInviteDetails);
router.route("/:token/accept").post(protect, acceptInvite);

export default router;

