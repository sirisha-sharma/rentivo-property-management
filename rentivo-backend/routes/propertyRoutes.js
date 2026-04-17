import express from "express";
const router = express.Router();
import {
    getProperties,
    getPropertyById,
    createProperty,
    updateProperty,
    deleteProperty,
    getMarketplaceProperties,
    getMarketplacePropertyById,
    createOrUpdatePropertyRating,
} from "../controllers/propertyController.js";
import { protect } from "../middleware/authMiddleware.js";
import { requireLandlordSubscription } from "../middleware/subscriptionMiddleware.js";
import { uploadPropertyImages } from "../middleware/uploadMiddleware.js";
import { SUBSCRIPTION_ACTIONS } from "../utils/subscriptionService.js";

const handlePropertyImageUpload = (req, res, next) => {
    uploadPropertyImages.array("images", 5)(req, res, (error) => {
        if (error) {
            return res.status(400).json({ message: error.message });
        }

        next();
    });
};

router.route("/marketplace").get(protect, getMarketplaceProperties);
router.route("/marketplace/:id").get(protect, getMarketplacePropertyById);
router.route("/:id/ratings").post(protect, createOrUpdatePropertyRating);
router
    .route("/")
    .get(protect, getProperties)
    .post(
        protect,
        requireLandlordSubscription(SUBSCRIPTION_ACTIONS.ADD_PROPERTY),
        handlePropertyImageUpload,
        createProperty
    );
router
    .route("/:id")
    .get(protect, getPropertyById)
    .put(protect, handlePropertyImageUpload, updateProperty)
    .delete(protect, deleteProperty);

export default router;
