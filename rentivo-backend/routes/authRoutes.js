import express from "express";
const router = express.Router();
import {
  registerUser,
  loginUser,
  verifyEmail,
  resendVerificationEmail,
} from "../controllers/authController.js";

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/verify-email/:token", verifyEmail);
router.post("/resend-verification", resendVerificationEmail);

export default router;
