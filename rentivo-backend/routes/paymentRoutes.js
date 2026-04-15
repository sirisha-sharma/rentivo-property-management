import express from "express";
import {
    initiatePayment,
    getPaymentConfig,
    getPaymentHistory,
    getPaymentById,
    handlePaymentFailure,
    verifyEsewaPayment,
    verifyKhaltiPayment,
} from "../controllers/paymentController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Payment initiation and configuration
router.post("/initiate", protect, initiatePayment);
router.get("/config", protect, getPaymentConfig);

// Payment history
router.get("/history", protect, getPaymentHistory);

// Payment gateway verification endpoints (callbacks)
router.get("/esewa/verify", verifyEsewaPayment);
router.get("/khalti/verify", verifyKhaltiPayment);
router.post("/khalti/verify", verifyKhaltiPayment);

// Payment failure handler
router.get("/failure", handlePaymentFailure);

// Payment detail
router.get("/:id", protect, getPaymentById);

export default router;
