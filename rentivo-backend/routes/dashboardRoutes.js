import express from "express";
const router = express.Router();
import {
    getLandlordChartData,
    getStats,
    getTenantChartData,
    getTenantStats,
    triggerInvoiceGeneration,
} from "../controllers/dashboardController.js";
import { protect } from "../middleware/authMiddleware.js";

router.route("/stats").get(protect, getStats);
router.route("/tenant-stats").get(protect, getTenantStats);
router.route("/landlord-charts").get(protect, getLandlordChartData);
router.route("/tenant-charts").get(protect, getTenantChartData);
router.route("/trigger-invoice-generation").post(protect, triggerInvoiceGeneration);

export default router;
