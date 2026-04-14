import Notification from "../models/notificationModel.js";
import User from "../models/userModel.js";
import { sendNotificationEmail } from "../utils/emailService.js";

// Get all notifications for the logged-in user
export const getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.user._id })
            .sort({ createdAt: -1 });
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Mark a single notification as read
export const markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);
        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }
        if (notification.userId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: "Not authorized" });
        }
        notification.read = true;
        await notification.save();
        res.json(notification);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Mark all notifications as read
export const markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { userId: req.user._id, read: false },
            { read: true }
        );
        res.json({ message: "All notifications marked as read" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Delete a notification
export const deleteNotification = async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);
        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }
        if (notification.userId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: "Not authorized" });
        }
        await notification.deleteOne();
        res.json({ message: "Notification deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Helper to create a notification (used by other controllers)
// Also sends an email to the user so they get notified outside the app.
export const createNotification = async (userId, type, message) => {
    try {
        await Notification.create({ userId, type, message });

        // Fire-and-forget email. We don't await this against the request
        // lifecycle — but we do await here so errors are caught and logged.
        const user = await User.findById(userId).select("name email phone");
        if (user?.email) {
            await sendNotificationEmail({
                to: user.email,
                name: user.name,
                type,
                message,
            });
        }
} catch (error) {
        console.log("Failed to create notification:", error.message);
    }
};
