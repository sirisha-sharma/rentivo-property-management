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
import { requireLandlordSubscription } from "../middleware/subscriptionMiddleware.js";
import { SUBSCRIPTION_ACTIONS } from "../utils/subscriptionService.js";

// Landlord routes
router
    .route("/")
    .get(protect, getTenants)
    .post(
        protect,
        requireLandlordSubscription(SUBSCRIPTION_ACTIONS.INVITE_TENANT),
        inviteTenant
    );
// Tenant routes (specific paths before /:id)
router.route("/my-invitations").get(protect, getMyInvitations);
router.route("/:id/accept").put(protect, acceptInvitation);
router.route("/:id/reject").put(protect, rejectInvitation);

router.route("/:id").delete(protect, deleteTenant);

export default router;
