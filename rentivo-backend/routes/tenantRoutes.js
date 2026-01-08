import express from "express";
const router = express.Router();
import { inviteTenant, getTenants } from "../controllers/tenantController.js";
import { protect } from "../middleware/authMiddleware.js";

router.route("/").get(protect, getTenants).post(protect, inviteTenant);

export default router;
