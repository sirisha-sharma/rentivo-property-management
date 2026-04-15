import express from "express";
const router = express.Router();
import { getLandlordChartData, getStats, getTenantStats } from "../controllers/dashboardController.js";
import { protect } from "../middleware/authMiddleware.js";

router.route("/stats").get(protect, getStats);
router.route("/tenant-stats").get(protect, getTenantStats);
router.route("/landlord-charts").get(protect, getLandlordChartData);

export default router;
