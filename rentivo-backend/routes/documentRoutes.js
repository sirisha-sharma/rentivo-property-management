import express from "express";
import { uploadDocument, getDocuments, deleteDocument } from "../controllers/documentController.js";
import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";

const router = express.Router();

const handleDocumentUpload = (req, res, next) => {
    upload.single("file")(req, res, (error) => {
        if (error) {
            return res.status(400).json({ message: error.message });
        }

        next();
    });
};

router.route("/")
    .post(protect, handleDocumentUpload, uploadDocument)
    .get(protect, getDocuments);

router.route("/:id")
    .delete(protect, deleteDocument);

export default router;
