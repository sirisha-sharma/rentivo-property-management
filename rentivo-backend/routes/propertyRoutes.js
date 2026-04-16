import express from "express";
const router = express.Router();
import {
    getProperties,
    getPropertyById,
    createProperty,
    updateProperty,
    deleteProperty,
    getMarketplaceProperties,
} from "../controllers/propertyController.js";
import { protect } from "../middleware/authMiddleware.js";
import { requireLandlordSubscription } from "../middleware/subscriptionMiddleware.js";
import { uploadPropertyImages } from "../middleware/uploadMiddleware.js";
import { SUBSCRIPTION_ACTIONS } from "../utils/subscriptionService.js";

router.route("/marketplace").get(protect, getMarketplaceProperties);
router
    .route("/")
    .get(protect, getProperties)
    .post(
        protect,
        requireLandlordSubscription(SUBSCRIPTION_ACTIONS.ADD_PROPERTY),
        uploadPropertyImages.array("images", 5),
        createProperty
    );
router.route("/:id").get(protect, getPropertyById).put(protect, uploadPropertyImages.array('images', 5), updateProperty).delete(protect, deleteProperty);

export default router;
