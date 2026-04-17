import express from "express";
import {
    getAdminInvoices,
    getAdminMaintenance,
    getAdminOverview,
    getAdminProperties,
    getAdminSubscriptions,
    getAdminTenancies,
    getAdminUsers,
    updateAdminUserStatus,
    deleteAdminProperty,
} from "../controllers/adminController.js";
import { protect, requireAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect, requireAdmin);

router.get("/overview", getAdminOverview);
router.get("/users", getAdminUsers);
router.patch("/users/:id/status", updateAdminUserStatus);
router.get("/properties", getAdminProperties);
router.delete("/properties/:id", deleteAdminProperty);
router.get("/tenancies", getAdminTenancies);
router.get("/invoices", getAdminInvoices);
router.get("/maintenance", getAdminMaintenance);
router.get("/subscriptions", getAdminSubscriptions);

export default router;
