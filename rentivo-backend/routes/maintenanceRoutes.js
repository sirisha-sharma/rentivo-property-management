import express from "express";
import {
    createRequest,
    getRequests,
    getRequestById,
    updateRequestStatus,
    deleteRequest,
} from "../controllers/maintenanceController.js";
import { protect } from "../middleware/authMiddleware.js";
import { uploadMaintenancePhotos } from "../middleware/uploadMiddleware.js";

const router = express.Router();

const handleMaintenancePhotoUpload = (req, res, next) => {
    uploadMaintenancePhotos.array("photos", 5)(req, res, (error) => {
        if (error) {
            return res.status(400).json({ message: error.message });
        }

        next();
    });
};

router.route("/")
    .post(protect, handleMaintenancePhotoUpload, createRequest)
    .get(protect, getRequests);

router.route("/:id")
    .get(protect, getRequestById)
    .delete(protect, deleteRequest);

router.route("/:id/status").put(protect, updateRequestStatus);

export default router;
