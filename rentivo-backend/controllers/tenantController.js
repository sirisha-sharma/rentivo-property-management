import Tenant from "../models/tenantModel.js";
import User from "../models/userModel.js";
import Property from "../models/propertyModel.js";

// Invite or add a tenant to a property
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
            return res.status(404).json({ message: "User with this email not found. Please ask tenant to register first." });
        }

        // Check if tenant already exists for this property
        const existingTenant = await Tenant.findOne({ userId: user._id, propertyId });
        if (existingTenant) {
            return res.status(400).json({ message: "Tenant already invited or active for this property." });
        }

        // Create Tenant record with Pending status
        const tenant = await Tenant.create({
            userId: user._id,
            propertyId,
            leaseStart,
            leaseEnd,
            status: "Pending",
        });

        res.status(201).json(tenant);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get all tenants for the landlord's properties
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

// Get invitations for the logged-in tenant
export const getMyInvitations = async (req, res) => {
    try {
        const invitations = await Tenant.find({ userId: req.user._id })
            .populate("propertyId", "title address type images");
        res.status(200).json(invitations);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Accept a tenant invitation
export const acceptInvitation = async (req, res) => {
    try {
        const tenant = await Tenant.findById(req.params.id);

        if (!tenant) {
            return res.status(404).json({ message: "Invitation not found" });
        }

        // Check if logged in user is the tenant
        if (tenant.userId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: "Not authorized to accept this invitation" });
        }

        if (tenant.status !== "Pending") {
            return res.status(400).json({ message: "Invitation is not pending" });
        }

        tenant.status = "Active";
        await tenant.save();

        res.status(200).json(tenant);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Reject a tenant invitation
export const rejectInvitation = async (req, res) => {
    try {
        const tenant = await Tenant.findById(req.params.id);

        if (!tenant) {
            return res.status(404).json({ message: "Invitation not found" });
        }

        // Check if logged in user is the tenant
        if (tenant.userId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: "Not authorized to reject this invitation" });
        }

        await tenant.deleteOne();

        res.status(200).json({ message: "Invitation rejected" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Remove a tenant from a property
export const deleteTenant = async (req, res) => {
    try {
        const tenant = await Tenant.findById(req.params.id).populate("propertyId");

        if (!tenant) {
            return res.status(404).json({ message: "Tenant not found" });
        }

        // Check if logged in user is the landlord of the property
        if (tenant.propertyId.landlordId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: "Not authorized to remove this tenant" });
        }

        await tenant.deleteOne();

        res.status(200).json({ id: req.params.id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
