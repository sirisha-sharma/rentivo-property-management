import express from "express";
import {
    createInvoice,
    getInvoices,
    getInvoiceById,
    updateInvoiceStatus,
    deleteInvoice,
    splitUtilityBill,
} from "../controllers/invoiceController.js";
import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";

const router = express.Router();

const handleUtilityBillUpload = (req, res, next) => {
    upload.single("billDocument")(req, res, (error) => {
        if (error) {
            return res.status(400).json({ message: error.message });
        }

        next();
    });
};

router.post("/split-utility-bill", protect, handleUtilityBillUpload, splitUtilityBill);

router.route("/")
    .post(protect, createInvoice)
    .get(protect, getInvoices);

router.route("/:id")
    .get(protect, getInvoiceById)
    .delete(protect, deleteInvoice);

router.route("/:id/status").put(protect, updateInvoiceStatus);

export default router;
