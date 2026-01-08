import Tenant from "../models/tenantModel.js";
import User from "../models/userModel.js";
import Property from "../models/propertyModel.js";

// @desc    Invite/Add a tenant to a property
// @route   POST /api/tenants
// @access  Private (Landlord)
export const inviteTenant = async (req, res) => {
    const { email, propertyId, leaseStart, leaseEnd } = req.body;

    if (!email || !propertyId || !leaseStart || !leaseEnd) {
        return res.status(400).json({ message: "Please fill in all fields" });
    }

    try {
        // Check if property belongs to landlord
        const property = await Property.findById(propertyId);
        if (!property) {
            return res.status(404).json({ message: "Property not found" });
        }

        if (property.landlordId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: "Not authorized to add tenant to this property" });
        }

        // Check if user exists
        let user = await User.findOne({ email });
        if (!user) {
            // Optionally create a placeholder user or return error
            // For FYP simplicity, assume tenant must be registered first or just return error
            return res.status(404).json({ message: "User with this email not found. Please ask tenant to register first." });
        }

        // Create Tenant record
        const tenant = await Tenant.create({
            userId: user._id,
            propertyId,
            leaseStart,
            leaseEnd,
            status: "Active",
        });

        res.status(201).json(tenant);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all tenants for a landlord's properties
// @route   GET /api/tenants
// @access  Private (Landlord)
export const getTenants = async (req, res) => {
    try {
        // Find all properties owned by landlord
        const properties = await Property.find({ landlordId: req.user._id });
        const propertyIds = properties.map(p => p._id);

        // Find tenants linked to these properties
        const tenants = await Tenant.find({ propertyId: { $in: propertyIds } })
            .populate("userId", "name email phone")
            .populate("propertyId", "title address");

        res.status(200).json(tenants);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
