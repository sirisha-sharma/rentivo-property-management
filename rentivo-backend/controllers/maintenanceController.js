import Maintenance from "../models/maintenanceModel.js";
import Property from "../models/propertyModel.js";
import Tenant from "../models/tenantModel.js";
import { createNotification } from "./notificationController.js";
import {
    getUploadedFileUrl,
    getUploadedStorageId,
    removeStoredFiles,
    resolveStoredFileUrl,
} from "../utils/storage.js";

// Normalize maintenance responses and hide storage-internal metadata.
const serializeMaintenanceRequest = (req, request) => {
    const requestObject = request.toObject ? request.toObject() : request;
    const { photoPublicIds, ...requestWithoutStorageIds } = requestObject;

    return {
        ...requestWithoutStorageIds,
        photos: (requestObject.photos || [])
            .map((photo) => resolveStoredFileUrl(req, photo))
            .filter(Boolean),
    };
};

const serializeMaintenanceRequests = (req, requests = []) =>
    requests.map((request) => serializeMaintenanceRequest(req, request));

export const createRequest = async (req, res) => {
    const uploadedPhotos = req.files || [];

    try {
        const { propertyId, title, description, priority, urgency } = req.body;

        const tenant = await Tenant.findOne({ userId: req.user._id, propertyId, status: "Active" });
        if (!tenant) {
            await removeStoredFiles(uploadedPhotos, { resourceType: "image" });
            return res.status(404).json({ message: "No active tenancy found for this property" });
        }

        const request = await Maintenance.create({
            propertyId,
            tenantId: tenant._id,
            title,
            description,
            priority: urgency || priority || "Medium",
            photos: uploadedPhotos.map((photo) => getUploadedFileUrl(photo)).filter(Boolean),
            photoPublicIds: uploadedPhotos
                .map((photo) => getUploadedStorageId(photo))
                .filter(Boolean),
            statusHistory: [{ status: "Open" }],
        });
        const populatedRequest = await Maintenance.findById(request._id)
            .populate("propertyId")
            .populate({
                path: "tenantId",
                populate: { path: "userId", select: "name email" },
            });

        const property = await Property.findById(propertyId);
        if (property) {
            await createNotification(
                property.landlordId,
                "maintenance",
                `New maintenance request: "${title}" for ${property.title}`
            );
        }

        res.status(201).json(serializeMaintenanceRequest(req, populatedRequest || request));
    } catch (error) {
        await removeStoredFiles(uploadedPhotos, { resourceType: "image" });
        res.status(500).json({ message: error.message });
    }
};

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

        res.json(serializeMaintenanceRequests(req, requests));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

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

        const propertyLandlordId = request.propertyId?.landlordId?.toString();
        const tenantUserId = request.tenantId?.userId?._id?.toString();
        const currentUserId = req.user._id.toString();

        const isAuthorizedLandlord =
            req.user.role === "landlord" && propertyLandlordId === currentUserId;
        const isAuthorizedTenant =
            req.user.role === "tenant" && tenantUserId === currentUserId;

        if (!isAuthorizedLandlord && !isAuthorizedTenant) {
            return res.status(403).json({ message: "Not authorized to view this maintenance request" });
        }

        res.json(serializeMaintenanceRequest(req, request));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Appends to statusHistory so there's a full audit trail of status changes
export const updateRequestStatus = async (req, res) => {
    try {
        const { status, note } = req.body;
        const request = await Maintenance.findById(req.params.id);

        if (!request) {
            return res.status(404).json({ message: "Maintenance request not found" });
        }

        const property = await Property.findOne({ _id: request.propertyId, landlordId: req.user._id });
        if (!property) {
            return res.status(401).json({ message: "Not authorized" });
        }

        request.status = status;
        request.statusHistory.push({ status, changedAt: new Date(), ...(note ? { note } : {}) });
        await request.save();
        const updatedRequest = await Maintenance.findById(request._id)
            .populate("propertyId")
            .populate({
                path: "tenantId",
                populate: { path: "userId", select: "name email" },
            });

        const tenant = await Tenant.findById(request.tenantId);
        if (tenant) {
            await createNotification(
                tenant.userId,
                "maintenance",
                `Your maintenance request has been updated to "${status}"`
            );
        }

        res.json(serializeMaintenanceRequest(req, updatedRequest || request));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Removes associated photos from storage before deleting the record
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

        await removeStoredFiles(
            (request.photos || []).map((photo, index) => ({
                filePath: photo,
                publicId: request.photoPublicIds?.[index],
                resourceType: "image",
            }))
        );

        await request.deleteOne();
        res.json({ message: "Maintenance request removed" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
