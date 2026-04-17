import express from "express";
const router = express.Router();
import { getUnitsByProperty } from "../controllers/unitController.js";
import { protect } from "../middleware/authMiddleware.js";

router.route("/property/:propertyId").get(protect, getUnitsByProperty);

export default router;
