import express from "express";
const router = express.Router();
import {
    getProperties,
    getPropertyById,
    createProperty,
    updateProperty,
    deleteProperty,
} from "../controllers/propertyController.js";
import { protect } from "../middleware/authMiddleware.js";

router.route("/").get(protect, getProperties).post(protect, createProperty);
router.route("/:id").get(protect, getPropertyById).put(protect, updateProperty).delete(protect, deleteProperty);

export default router;
