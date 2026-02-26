import express from "express";
import {
    createRequest,
    getRequests,
    getRequestById,
    updateRequestStatus,
    deleteRequest,
} from "../controllers/maintenanceController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/")
    .post(protect, createRequest)
    .get(protect, getRequests);

router.route("/:id")
    .get(protect, getRequestById)
    .delete(protect, deleteRequest);

router.route("/:id/status").put(protect, updateRequestStatus);

export default router;
