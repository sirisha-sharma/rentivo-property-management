import express from "express";
import {
    getAllowedContacts,
    getConversations,
    getMessages,
    sendMessage,
    markThreadAsRead,
    getUnreadCount,
} from "../controllers/messageController.js";
import { protect } from "../middleware/authMiddleware.js";
import { uploadMessageAttachment } from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.use(protect);

const handleAttachmentUpload = (req, res, next) => {
    uploadMessageAttachment.single("attachment")(req, res, (error) => {
        if (error) {
            return res.status(400).json({ message: error.message });
        }

        next();
    });
};

router.get("/contacts", getAllowedContacts);
router.get("/conversations", getConversations);
router.get("/unread-count", getUnreadCount);
router.get("/:otherUserId/:propertyId", getMessages);
router.post("/", handleAttachmentUpload, sendMessage);
router.put("/:otherUserId/:propertyId/read", markThreadAsRead);

export default router;
