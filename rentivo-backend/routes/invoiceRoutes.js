import express from "express";
import {
    createInvoice,
    getInvoices,
    getInvoiceById,
    updateInvoiceStatus,
    deleteInvoice,
} from "../controllers/invoiceController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/")
    .post(protect, createInvoice)
    .get(protect, getInvoices);

router.route("/:id")
    .get(protect, getInvoiceById)
    .delete(protect, deleteInvoice);

router.route("/:id/status").put(protect, updateInvoiceStatus);

export default router;
