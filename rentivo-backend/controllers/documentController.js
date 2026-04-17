import Document from "../models/documentModel.js";
import Property from "../models/propertyModel.js";
import Tenant from "../models/tenantModel.js";
import { createNotification } from "./notificationController.js";
import {
    getUploadedFileUrl,
    getUploadedStorageId,
    removeStoredFile,
    resolveStoredFileUrl,
} from "../utils/storage.js";

const serializeDocument = (req, document) => {
    const documentObject = document.toObject ? document.toObject() : document;

    return {
        ...documentObject,
        downloadUrl: resolveStoredFileUrl(req, documentObject.filePath),
    };
};

// Upload a new document (landlord only)
export const uploadDocument = async (req, res) => {
    const uploadedFile = req.file;

    try {
        const { propertyId, name, type } = req.body;

        if (!uploadedFile) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        // Verify property belongs to this landlord
        const property = await Property.findOne({ _id: propertyId, landlordId: req.user._id });
        if (!property) {
            await removeStoredFile({
                filePath: uploadedFile.path,
                storageId: getUploadedStorageId(uploadedFile),
                resourceType: "auto",
            });
            return res.status(404).json({ message: "Property not found or unauthorized" });
        }

        const document = await Document.create({
            propertyId,
            uploadedBy: req.user._id,
            name,
            type,
            fileName: uploadedFile.originalname,
            filePath: getUploadedFileUrl(uploadedFile),
            storageId: getUploadedStorageId(uploadedFile),
        });

        // Notify active tenants of this property
        const tenants = await Tenant.find({ propertyId, status: "Active" });
        for (const t of tenants) {
            await createNotification(
                t.userId,
                "document",
                `New document uploaded: "${name}" for ${property.title}`
            );
        }

        res.status(201).json(serializeDocument(req, document));
    } catch (error) {
        await removeStoredFile({
            filePath: uploadedFile?.path,
            storageId: getUploadedStorageId(uploadedFile),
            resourceType: "auto",
        });
        res.status(500).json({ message: error.message });
    }
};

// Get documents (landlord sees own uploads, tenant sees docs for their properties)
export const getDocuments = async (req, res) => {
    try {
        let documents;
        if (req.user.role === "landlord") {
            documents = await Document.find({ uploadedBy: req.user._id })
                .populate("propertyId", "title")
                .sort({ createdAt: -1 });
        } else {
            const tenantRecords = await Tenant.find({ userId: req.user._id, status: "Active" });
            const propertyIds = tenantRecords.map((t) => t.propertyId);
            documents = await Document.find({ propertyId: { $in: propertyIds } })
                .populate("propertyId", "title")
                .sort({ createdAt: -1 });
        }

        res.json(documents.map((document) => serializeDocument(req, document)));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Delete a document (landlord only)
export const deleteDocument = async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);

        if (!document) {
            return res.status(404).json({ message: "Document not found" });
        }

        if (document.uploadedBy.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: "Not authorized" });
        }

        await removeStoredFile({
            filePath: document.filePath,
            storageId: document.storageId,
            resourceType: "auto",
        });

        await document.deleteOne();
        res.json({ message: "Document deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
