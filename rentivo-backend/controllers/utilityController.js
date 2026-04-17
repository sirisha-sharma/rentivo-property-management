import Property from "../models/propertyModel.js";
import Tenant from "../models/tenantModel.js";
import { createNotification } from "./notificationController.js";
import {
    buildUtilitySplitDetails,
    isUtilitySplitValidationError,
} from "../utils/utilitySplit.js";

/**
 * Utility Bill Splitting Algorithm
 * Supports 4 methods: equal, room-size, occupancy, custom
 *
 * @desc Calculate utility split for a property based on configured split method
 * @route POST /api/utilities/calculate-split
 * @access Private (Landlord only)
 */
export const calculateUtilitySplit = async (req, res) => {
    try {
        const { propertyId, utilities } = req.body;

        // Validate input
        if (!propertyId || !utilities) {
            return res.status(400).json({
                success: false,
                message: "Property ID and utilities are required"
            });
        }

        // Fetch property with split method configuration
        const property = await Property.findById(propertyId);
        if (!property) {
            return res.status(404).json({
                success: false,
                message: "Property not found"
            });
        }

        // Verify landlord owns the property
        if (property.landlordId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to access this property"
            });
        }

        // Fetch active tenants for the property
        const tenants = await Tenant.find({
            propertyId: propertyId,
            status: "Active"
        }).populate('userId', 'name email');

        if (tenants.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No active tenants found for this property"
            });
        }

        const splitDetails = buildUtilitySplitDetails({
            splitMethod: property.splitMethod,
            tenants,
            utilities,
            roomSizes: property.roomSizes,
            occupancyData: req.body.occupancyData,
            customSplits: req.body.customSplits,
        });

        // Notify each tenant of their utility split (fire and forget)
        try {
            const propertyLabel = property.title || property.address || "your property";
            await Promise.all(
                splitDetails.splits.map(async (split) => {
                    if (!split.userId) return;
                    const amount = Number(split.totalAmount || 0).toFixed(2);
                    await createNotification(
                        split.userId,
                        "invoice",
                        `Your utility share for ${propertyLabel} has been calculated: NPR ${amount} (method: ${property.splitMethod}).`
                    );
                })
            );
        } catch (notifyError) {
            console.error(
                "Failed to send utility split notifications:",
                notifyError.message
            );
        }

        res.status(200).json({
            success: true,
            splitMethod: splitDetails.splitMethod,
            totalUtilities: splitDetails.totalUtilities,
            tenantCount: splitDetails.tenantCount,
            splits: splitDetails.splits
        });

    } catch (error) {
        console.error("Error calculating utility split:", error);
        res.status(isUtilitySplitValidationError(error) ? 400 : 500).json({
            success: false,
            message: error.message || "Error calculating utility split"
        });
    }
};

/**
 * Get property utility configuration
 * @desc Get property's split method and room size configuration
 * @route GET /api/utilities/property-config/:propertyId
 * @access Private
 */
export const getPropertyUtilityConfig = async (req, res) => {
    try {
        const property = await Property.findById(req.params.propertyId);

        if (!property) {
            return res.status(404).json({
                success: false,
                message: "Property not found"
            });
        }

        // Verify authorization (landlord or tenant of property)
        const tenant = await Tenant.findOne({
            propertyId: req.params.propertyId,
            userId: req.user._id
        });

        if (property.landlordId.toString() !== req.user._id.toString() && !tenant) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to view this property configuration"
            });
        }

        res.status(200).json({
            success: true,
            config: {
                splitMethod: property.splitMethod,
                roomSizes: property.roomSizes,
                units: property.units
            }
        });

    } catch (error) {
        console.error("Error fetching utility config:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Error fetching utility configuration"
        });
    }
};
