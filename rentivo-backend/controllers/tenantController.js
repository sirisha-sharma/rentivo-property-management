import Tenant from "../models/tenantModel.js";
import User from "../models/userModel.js";
import Property from "../models/propertyModel.js";
import Unit from "../models/unitModel.js";
import PropertyAssociation from "../models/propertyAssociationModel.js";
import { createNotification } from "./notificationController.js";
import { syncPropertyUnits } from "../utils/propertyUnits.js";

// flips property to "occupied" once all units are filled, "vacant" otherwise
const updatePropertyOccupancyStatus = async (propertyId) => {
    if (!propertyId) {
        return null;
    }

    const [activeTenants, property] = await Promise.all([
        Tenant.countDocuments({ propertyId, status: "Active" }),
        Property.findById(propertyId).select("units status"),
    ]);

    if (!property) {
        return null;
    }

    property.status = activeTenants >= property.units ? "occupied" : "vacant";
    await property.save();
    await syncPropertyUnits(property);

    return property.status;
};

// keeps association history - firstAssociatedAt is set once, lastAssociatedAt updates each time
const upsertPropertyAssociation = async (tenant) => {
    if (!tenant?.userId || !tenant?.propertyId) {
        return null;
    }

    const firstAssociatedAt = tenant.leaseStart || tenant.createdAt || new Date();
    const lastAssociatedAt = tenant.leaseEnd || new Date();

    return PropertyAssociation.findOneAndUpdate(
        { userId: tenant.userId, propertyId: tenant.propertyId },
        {
            $setOnInsert: {
                firstAssociatedAt,
            },
            $set: {
                lastAssociatedAt,
                endedAt: null,
            },
        },
        { upsert: true, new: true }
    );
};

export const inviteTenant = async (req, res) => {
    const { email, propertyId, unitId, leaseStart, leaseEnd, securityDeposit, monthlyRent } = req.body;

    if (!email || !propertyId || !leaseStart || !leaseEnd) {
        return res.status(400).json({ message: "Please fill in all fields" });
    }

    const parsedSecurityDeposit = Number(securityDeposit ?? 0);
    if (!Number.isFinite(parsedSecurityDeposit) || parsedSecurityDeposit < 0) {
        return res.status(400).json({ message: "Security deposit must be a valid non-negative number" });
    }

    try {
        const property = await Property.findById(propertyId);
        if (!property) {
            return res.status(404).json({ message: "Property not found" });
        }

        if (property.landlordId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: "Not authorized to add tenant to this property" });
        }

        let user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User with this email not found. Please ask tenant to register first." });
        }

        const existingTenant = await Tenant.findOne({ userId: user._id, propertyId });
        if (existingTenant) {
            return res.status(400).json({ message: "Tenant already invited or active for this property." });
        }

        const unit = await Unit.findOne({ _id: unitId, propertyId });
        if (!unit) {
            return res.status(404).json({ message: "Unit not found for this property" });
        }
        if (unit.status === "occupied") {
            return res.status(400).json({ message: "This unit is already occupied" });
        }

        // unit stays "vacant" until the invite is accepted, so we also need to check for pending invites
        const pendingOnUnit = await Tenant.findOne({ unitId, status: "Pending" });
        if (pendingOnUnit) {
            return res.status(400).json({ message: "This unit already has a pending invitation." });
        }

        const tenant = await Tenant.create({
            userId: user._id,
            propertyId,
            unitId,
            monthlyRent: Number(monthlyRent),
            leaseStart,
            leaseEnd,
            securityDeposit: parsedSecurityDeposit,
            status: "Pending",
        });

        await createNotification(
            user._id,
            "tenant",
            `You have a new rental invitation for ${property.title}. Review it in Rentivo to accept or reject.`
        );

        res.status(201).json(tenant);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getTenants = async (req, res) => {
    try {
        const properties = await Property.find({ landlordId: req.user._id });
        const propertyIds = properties.map(p => p._id);

        const tenants = await Tenant.find({ propertyId: { $in: propertyIds } })
            .populate("userId", "name email phone")
            .populate("propertyId", "title address");

        res.status(200).json(tenants);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getMyInvitations = async (req, res) => {
    try {
        const invitations = await Tenant.find({ userId: req.user._id })
            .populate({
                path: "propertyId",
                select: "title address type images splitMethod landlordId",
                populate: { path: "landlordId", select: "name _id" },
            });
        res.status(200).json(invitations);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const acceptInvitation = async (req, res) => {
    try {
        const tenant = await Tenant.findById(req.params.id);

        if (!tenant) {
            return res.status(404).json({ message: "Invitation not found" });
        }

        if (tenant.userId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: "Not authorized to accept this invitation" });
        }

        if (tenant.status !== "Pending") {
            return res.status(400).json({ message: "Invitation is not pending" });
        }

        tenant.status = "Active";
        await tenant.save();
        await upsertPropertyAssociation(tenant);
        await updatePropertyOccupancyStatus(tenant.propertyId);

        // lock the unit so no one else can be invited to it
        if (tenant.unitId) {
            await Unit.findByIdAndUpdate(tenant.unitId, { status: "occupied", currentTenant: tenant._id });
        }

        const property = await Property.findById(tenant.propertyId).select("title landlordId");
        if (property?.landlordId) {
            await createNotification(
                property.landlordId,
                "tenant",
                `${req.user.name} accepted the rental invitation for ${property.title}.`
            );
        }

        res.status(200).json(tenant);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const rejectInvitation = async (req, res) => {
    try {
        const tenant = await Tenant.findById(req.params.id);

        if (!tenant) {
            return res.status(404).json({ message: "Invitation not found" });
        }

        if (tenant.userId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: "Not authorized to reject this invitation" });
        }

        const property = await Property.findById(tenant.propertyId).select("title landlordId");

        await tenant.deleteOne();
        await updatePropertyOccupancyStatus(tenant.propertyId);

        if (property?.landlordId) {
            await createNotification(
                property.landlordId,
                "tenant",
                `${req.user.name} rejected the rental invitation for ${property.title}.`
            );
        }

        res.status(200).json({ message: "Invitation rejected" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteTenant = async (req, res) => {
    try {
        const tenant = await Tenant.findById(req.params.id).populate("propertyId");

        if (!tenant) {
            return res.status(404).json({ message: "Tenant not found" });
        }

        if (tenant.propertyId.landlordId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: "Not authorized to remove this tenant" });
        }

        // notify before deleting so we still have tenant data for the message
        await createNotification(
            tenant.userId,
            "tenant",
            `Your tenancy for ${tenant.propertyId.title} has been removed by the landlord.`
        );

        if (tenant.status === "Active") {
            await PropertyAssociation.findOneAndUpdate(
                { userId: tenant.userId, propertyId: tenant.propertyId._id },
                {
                    $setOnInsert: {
                        firstAssociatedAt: tenant.leaseStart || tenant.createdAt || new Date(),
                    },
                    $set: {
                        lastAssociatedAt: new Date(),
                        endedAt: new Date(),
                    },
                },
                { upsert: true, new: true }
            );

            if (tenant.unitId) {
                await Unit.findByIdAndUpdate(tenant.unitId, { status: "vacant", currentTenant: null });
            }
        }

        await tenant.deleteOne();
        await updatePropertyOccupancyStatus(tenant.propertyId._id);

        res.status(200).json({ id: req.params.id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
