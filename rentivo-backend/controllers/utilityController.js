import Property from "../models/propertyModel.js";
import Tenant from "../models/tenantModel.js";

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

        // Calculate total utilities amount
        const totalUtilities = Object.values(utilities).reduce((sum, value) => sum + (parseFloat(value) || 0), 0);

        let splitResult = [];

        // Apply splitting algorithm based on property's splitMethod
        switch (property.splitMethod) {
            case "equal":
                splitResult = calculateEqualSplit(tenants, utilities, totalUtilities);
                break;

            case "room-size":
                splitResult = calculateRoomSizeSplit(tenants, utilities, totalUtilities, property.roomSizes);
                break;

            case "occupancy":
                splitResult = calculateOccupancySplit(tenants, utilities, totalUtilities, req.body.occupancyData);
                break;

            case "custom":
                splitResult = calculateCustomSplit(tenants, utilities, req.body.customSplits);
                break;

            default:
                return res.status(400).json({
                    success: false,
                    message: "Invalid split method"
                });
        }

        res.status(200).json({
            success: true,
            splitMethod: property.splitMethod,
            totalUtilities: totalUtilities,
            tenantCount: tenants.length,
            splits: splitResult
        });

    } catch (error) {
        console.error("Error calculating utility split:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Error calculating utility split"
        });
    }
};

/**
 * Equal Split Method
 * Divides utilities equally among all tenants
 */
const calculateEqualSplit = (tenants, utilities, totalUtilities) => {
    const tenantCount = tenants.length;
    const perTenantAmount = totalUtilities / tenantCount;

    return tenants.map(tenant => ({
        tenantId: tenant._id,
        userId: tenant.userId._id,
        tenantName: tenant.userId.name,
        tenantEmail: tenant.userId.email,
        splitPercentage: (100 / tenantCount).toFixed(2),
        utilities: {
            electricity: (utilities.electricity || 0) / tenantCount,
            water: (utilities.water || 0) / tenantCount,
            internet: (utilities.internet || 0) / tenantCount,
            gas: (utilities.gas || 0) / tenantCount,
            waste: (utilities.waste || 0) / tenantCount,
            other: (utilities.other || 0) / tenantCount
        },
        totalAmount: perTenantAmount
    }));
};

/**
 * Room Size Split Method
 * Divides utilities proportionally based on room/unit square footage
 */
const calculateRoomSizeSplit = (tenants, utilities, totalUtilities, roomSizes) => {
    if (!roomSizes || roomSizes.length === 0) {
        throw new Error("Room sizes not configured for this property");
    }

    // Calculate total square footage
    const totalSquareFeet = roomSizes.reduce((sum, room) => sum + (room.size || 0), 0);

    if (totalSquareFeet === 0) {
        throw new Error("Total square footage cannot be zero");
    }

    return tenants.map((tenant, index) => {
        const roomSize = roomSizes[index]?.size || 0;
        const proportion = roomSize / totalSquareFeet;

        return {
            tenantId: tenant._id,
            userId: tenant.userId._id,
            tenantName: tenant.userId.name,
            tenantEmail: tenant.userId.email,
            roomName: roomSizes[index]?.name || `Unit ${index + 1}`,
            roomSize: roomSize,
            splitPercentage: (proportion * 100).toFixed(2),
            utilities: {
                electricity: (utilities.electricity || 0) * proportion,
                water: (utilities.water || 0) * proportion,
                internet: (utilities.internet || 0) * proportion,
                gas: (utilities.gas || 0) * proportion,
                waste: (utilities.waste || 0) * proportion,
                other: (utilities.other || 0) * proportion
            },
            totalAmount: totalUtilities * proportion
        };
    });
};

/**
 * Occupancy Split Method
 * Divides utilities based on number of occupants per unit
 */
const calculateOccupancySplit = (tenants, utilities, totalUtilities, occupancyData) => {
    if (!occupancyData || Object.keys(occupancyData).length === 0) {
        throw new Error("Occupancy data is required for occupancy-based splitting");
    }

    // Calculate total occupants
    const totalOccupants = Object.values(occupancyData).reduce((sum, count) => sum + (parseInt(count) || 0), 0);

    if (totalOccupants === 0) {
        throw new Error("Total occupants cannot be zero");
    }

    return tenants.map(tenant => {
        const occupantCount = occupancyData[tenant._id.toString()] || 1;
        const proportion = occupantCount / totalOccupants;

        return {
            tenantId: tenant._id,
            userId: tenant.userId._id,
            tenantName: tenant.userId.name,
            tenantEmail: tenant.userId.email,
            occupantCount: occupantCount,
            splitPercentage: (proportion * 100).toFixed(2),
            utilities: {
                electricity: (utilities.electricity || 0) * proportion,
                water: (utilities.water || 0) * proportion,
                internet: (utilities.internet || 0) * proportion,
                gas: (utilities.gas || 0) * proportion,
                waste: (utilities.waste || 0) * proportion,
                other: (utilities.other || 0) * proportion
            },
            totalAmount: totalUtilities * proportion
        };
    });
};

/**
 * Custom Split Method
 * Uses predefined custom splits (percentages or amounts) provided by landlord
 */
const calculateCustomSplit = (tenants, utilities, customSplits) => {
    if (!customSplits || Object.keys(customSplits).length === 0) {
        throw new Error("Custom split data is required for custom splitting method");
    }

    return tenants.map(tenant => {
        const tenantCustomSplit = customSplits[tenant._id.toString()];

        if (!tenantCustomSplit) {
            throw new Error(`Custom split not defined for tenant ${tenant.userId.name}`);
        }

        return {
            tenantId: tenant._id,
            userId: tenant.userId._id,
            tenantName: tenant.userId.name,
            tenantEmail: tenant.userId.email,
            utilities: {
                electricity: tenantCustomSplit.electricity || 0,
                water: tenantCustomSplit.water || 0,
                internet: tenantCustomSplit.internet || 0,
                gas: tenantCustomSplit.gas || 0,
                waste: tenantCustomSplit.waste || 0,
                other: tenantCustomSplit.other || 0
            },
            totalAmount: Object.values(tenantCustomSplit).reduce((sum, val) => sum + (parseFloat(val) || 0), 0)
        };
    });
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
