import express from "express";
import {
    initiatePayment,
    getPaymentConfig,
    getPaymentHistory,
    getPaymentById,
    handlePaymentFailure,
    verifyEsewaPayment,
} from "../controllers/paymentController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Payment initiation and configuration
router.post("/initiate", protect, initiatePayment);
router.get("/config", protect, getPaymentConfig);

// Payment history
router.get("/history", protect, getPaymentHistory);
router.get("/:id", protect, getPaymentById);

// eSewa verification endpoint (callback from payment gateway)
router.get("/esewa/verify", verifyEsewaPayment);

// Payment failure handler
router.get("/failure", handlePaymentFailure);

export default router;
