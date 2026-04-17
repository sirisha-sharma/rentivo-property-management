import express from "express";
import {

// Defines API routes for notificationroutes features.

    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
} from "../controllers/notificationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/").get(protect, getNotifications);
router.route("/read-all").put(protect, markAllAsRead);
router.route("/:id/read").put(protect, markAsRead);
router.route("/:id").delete(protect, deleteNotification);

export default router;
