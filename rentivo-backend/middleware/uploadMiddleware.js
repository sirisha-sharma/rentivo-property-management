import multer from "multer";
import path from "path";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary, { ensureCloudinaryConfig } from "../config/cloudinary.js";

// Core module for uploadmiddleware features.

const DOCUMENT_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "doc", "docx"];
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

const getFileExtension = (file) =>
    path.extname(file?.originalname || "")
        .replace(".", "")
        .toLowerCase();

const buildUniquePublicId = (prefix) =>
    `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}`;

const createExtensionFilter = (allowedExtensions, message) => (req, file, cb) => {
    const extension = getFileExtension(file);

    if (allowedExtensions.includes(extension)) {
        cb(null, true);
        return;
    }

    cb(new Error(message), false);
};

const createCloudinaryStorage = ({ folder, resourceType = "image", publicIdPrefix }) =>
    new CloudinaryStorage({
        cloudinary,
        params: async (req, file) => {
            ensureCloudinaryConfig();
            const resolvedResourceType =
                typeof resourceType === "function"
                    ? resourceType(req, file)
                    : resourceType;

            return {
                folder:
                    typeof folder === "function"
                        ? folder(req, file)
                        : folder,
                resource_type: resolvedResourceType,
                allowed_formats:
                    resolvedResourceType === "image" ? IMAGE_EXTENSIONS : DOCUMENT_EXTENSIONS,
                public_id: buildUniquePublicId(
                    typeof publicIdPrefix === "function"
                        ? publicIdPrefix(req, file)
                        : publicIdPrefix
                ),
            };
        },
    });

const documentFileFilter = createExtensionFilter(
    DOCUMENT_EXTENSIONS,
    "Only PDF, images, and Word documents are allowed"
);

const imageFileFilter = createExtensionFilter(
    IMAGE_EXTENSIONS,
    "Only image files (.jpg, .jpeg, .png, .webp) are allowed"
);

const documentStorage = createCloudinaryStorage({
    folder: (req, file) =>
        file?.fieldname === "billDocument"
            ? "rentivo/utility-bills"
            : "rentivo/documents",
    resourceType: "raw",
    publicIdPrefix: (req, file) =>
        file?.fieldname === "billDocument" ? "utility-bill" : "document",
});

const propertyImageStorage = createCloudinaryStorage({
    folder: "rentivo/properties",
    resourceType: "image",
    publicIdPrefix: "property",
});

const maintenancePhotoStorage = createCloudinaryStorage({
    folder: "rentivo/maintenance",
    resourceType: "image",
    publicIdPrefix: "maintenance",
});

const messageAttachmentStorage = createCloudinaryStorage({
    folder: "rentivo/messages",
    resourceType: "raw",
    publicIdPrefix: "message",
});

export const upload = multer({
    storage: documentStorage,
    fileFilter: documentFileFilter,
    limits: { fileSize: 10 * 1024 * 1024 },
});

export const uploadPropertyImages = multer({
    storage: propertyImageStorage,
    fileFilter: imageFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
});

export const uploadMaintenancePhotos = multer({
    storage: maintenancePhotoStorage,
    fileFilter: imageFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
});

export const uploadMessageAttachment = multer({
    storage: messageAttachmentStorage,
    fileFilter: documentFileFilter,
    limits: { fileSize: 10 * 1024 * 1024 },
});
