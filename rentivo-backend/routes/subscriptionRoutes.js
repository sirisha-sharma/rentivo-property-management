import express from "express";
import { getCurrentSubscription } from "../controllers/subscriptionController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/current", protect, getCurrentSubscription);

export default router;
