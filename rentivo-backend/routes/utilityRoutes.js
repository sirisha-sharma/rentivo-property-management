import express from "express";
import { calculateUtilitySplit, getPropertyUtilityConfig } from "../controllers/utilityController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Calculate utility split for a property
router.post("/calculate-split", protect, calculateUtilitySplit);

// Get property utility configuration
router.get("/property-config/:propertyId", protect, getPropertyUtilityConfig);

export default router;
