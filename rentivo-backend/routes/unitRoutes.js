import express from "express";
import {
    getUnits,
    getUnitsByProperty,
    createUnit,
    updateUnit,
    deleteUnit,
} from "../controllers/unitController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/units?propertyId=xxx
router.get("/", protect, getUnits);

// POST /api/units
router.post("/", protect, createUnit);

// PUT /api/units/:id
router.put("/:id", protect, updateUnit);

// DELETE /api/units/:id
router.delete("/:id", protect, deleteUnit);

// Legacy: GET /api/units/property/:propertyId
router.get("/property/:propertyId", protect, getUnitsByProperty);

export default router;
