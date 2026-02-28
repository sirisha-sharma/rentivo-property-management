import Maintenance from "../models/maintenanceModel.js";
import Property from "../models/propertyModel.js";
import Tenant from "../models/tenantModel.js";
import { createNotification } from "./notificationController.js";

// Create a new maintenance request
export const createRequest = async (req, res) => {
    try {
        const { propertyId, title, description, priority } = req.body;

        const tenant = await Tenant.findOne({ userId: req.user._id, propertyId, status: "Active" });
        if (!tenant) {
            return res.status(404).json({ message: "No active tenancy found for this property" });
        }

        const request = await Maintenance.create({
            propertyId,
            tenantId: tenant._id,
            title,
            description,
            priority: priority || "Medium",
        });

        // Notify the landlord about the new request
        const property = await Property.findById(propertyId);
        if (property) {
            await createNotification(
                property.landlordId,
                "maintenance",
                `New maintenance request: "${title}" for ${property.title}`
            );
        }

        res.status(201).json(request);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get all maintenance requests (filtered by role)
export const getRequests = async (req, res) => {
    try {
        let requests;
        if (req.user.role === "landlord") {
            const properties = await Property.find({ landlordId: req.user._id });
            const propertyIds = properties.map((p) => p._id);

            requests = await Maintenance.find({ propertyId: { $in: propertyIds } })
                .populate({
                    path: "tenantId",
                    populate: { path: "userId", select: "name email" },
                })
                .populate("propertyId")
                .sort({ createdAt: -1 });
        } else if (req.user.role === "tenant") {
            const tenantRecords = await Tenant.find({ userId: req.user._id });
            const tenantIds = tenantRecords.map((t) => t._id);

            requests = await Maintenance.find({ tenantId: { $in: tenantIds } })
                .populate("propertyId")
                .populate({
                    path: "tenantId",
                    populate: { path: "userId", select: "name email" },
                })
                .sort({ createdAt: -1 });
        } else {
            return res.status(403).json({ message: "Invalid role" });
        }

        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get single maintenance request by ID
export const getRequestById = async (req, res) => {
    try {
        const request = await Maintenance.findById(req.params.id)
            .populate({
                path: "tenantId",
                populate: { path: "userId", select: "name email" },
            })
            .populate("propertyId");

        if (!request) {
            return res.status(404).json({ message: "Maintenance request not found" });
        }

        res.json(request);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update maintenance request status (landlord only)
export const updateRequestStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const request = await Maintenance.findById(req.params.id);

        if (!request) {
            return res.status(404).json({ message: "Maintenance request not found" });
        }

        const property = await Property.findOne({ _id: request.propertyId, landlordId: req.user._id });
        if (!property) {
            return res.status(401).json({ message: "Not authorized" });
        }

        request.status = status;
        const updatedRequest = await request.save();

        // Notify the tenant about the status update
        const tenant = await Tenant.findById(request.tenantId);
        if (tenant) {
            await createNotification(
                tenant.userId,
                "maintenance",
                `Your maintenance request has been updated to "${status}"`
            );
        }

        res.json(updatedRequest);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Delete maintenance request (landlord only)
export const deleteRequest = async (req, res) => {
    try {
        const request = await Maintenance.findById(req.params.id);

        if (!request) {
            return res.status(404).json({ message: "Maintenance request not found" });
        }

        const property = await Property.findOne({ _id: request.propertyId, landlordId: req.user._id });
        if (!property) {
            return res.status(401).json({ message: "Not authorized" });
        }

        await request.deleteOne();
        res.json({ message: "Maintenance request removed" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
