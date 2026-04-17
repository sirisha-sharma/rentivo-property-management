import express from "express";

// Defines API routes for authroutes features.

const router = express.Router();
import {
  registerUser,
  loginUser,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
  verify2FA,
  toggle2FA,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/verify-email/:token", verifyEmail);
router.post("/resend-verification", resendVerificationEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.post("/verify-2fa", verify2FA);
router.post("/toggle-2fa", protect, toggle2FA);

export default router;
