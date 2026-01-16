import Property from "../models/propertyModel.js";
import Tenant from "../models/tenantModel.js";

// This function gets the dashboard statistics for the landlord
export const getStats = async (req, res) => {
    try {
        // Get properties count for landlord
        const propertiesCount = await Property.countDocuments({ landlordId: req.user._id });

        // Get property IDs for this landlord
        const properties = await Property.find({ landlordId: req.user._id });
        const propertyIds = properties.map(p => p._id);

        // Get tenant counts
        const tenantsCount = await Tenant.countDocuments({
            propertyId: { $in: propertyIds },
            status: "Active"
        });

        const pendingTenantsCount = await Tenant.countDocuments({
            propertyId: { $in: propertyIds },
            status: "Pending"
        });

        res.status(200).json({
            propertiesCount,
            tenantsCount,
            pendingTenantsCount
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// This function gets the dashboard statistics for the tenant
export const getTenantStats = async (req, res) => {
    try {
        // Get active tenancies for this tenant
        const activeProperties = await Tenant.countDocuments({
            userId: req.user._id,
            status: "Active"
        });

        const pendingInvitations = await Tenant.countDocuments({
            userId: req.user._id,
            status: "Pending"
        });

        res.status(200).json({
            activeProperties,
            pendingInvitations
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
