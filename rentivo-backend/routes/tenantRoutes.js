import express from "express";
const router = express.Router();
import {
    inviteTenant,
    getTenants,
    getMyInvitations,
    acceptInvitation,
    rejectInvitation,
    deleteTenant
} from "../controllers/tenantController.js";
import { protect } from "../middleware/authMiddleware.js";

// Landlord routes
router.route("/").get(protect, getTenants).post(protect, inviteTenant);
router.route("/:id").delete(protect, deleteTenant);

// Tenant routes
router.route("/my-invitations").get(protect, getMyInvitations);
router.route("/:id/accept").put(protect, acceptInvitation);
router.route("/:id/reject").put(protect, rejectInvitation);

export default router;
