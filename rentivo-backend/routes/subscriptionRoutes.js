import express from "express";
import { getCurrentSubscription } from "../controllers/subscriptionController.js";
import {

// Defines API routes for subscriptionroutes features.

    getSubscriptionConfig,
    getSubscriptionPaymentById,
    getSubscriptionPaymentHistory,
    handleSubscriptionEsewaIntentCallback,
    handleSubscriptionPaymentFailure,
    initiateSubscriptionCheckout,
    serveSubscriptionEsewaLaunchPage,
    verifySubscriptionEsewaPayment,
    verifySubscriptionKhaltiPayment,
} from "../controllers/subscriptionBillingController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/config", protect, getSubscriptionConfig);
router.get("/current", protect, getCurrentSubscription);
router.post("/checkout", protect, initiateSubscriptionCheckout);
router.get("/payments", protect, getSubscriptionPaymentHistory);
router.get("/payments/:id", protect, getSubscriptionPaymentById);

router.get("/esewa/launch/:token", serveSubscriptionEsewaLaunchPage);
router.get("/esewa/intent/callback", handleSubscriptionEsewaIntentCallback);
router.post("/esewa/intent/callback", handleSubscriptionEsewaIntentCallback);
router.get("/esewa/verify", verifySubscriptionEsewaPayment);
router.get("/esewa/failure/:transactionId", handleSubscriptionPaymentFailure);
router.get("/khalti/verify", verifySubscriptionKhaltiPayment);
router.post("/khalti/verify", verifySubscriptionKhaltiPayment);
router.get("/failure", handleSubscriptionPaymentFailure);

export default router;
