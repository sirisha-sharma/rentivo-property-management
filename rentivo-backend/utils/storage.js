import fs from "fs";
import cloudinary from "../config/cloudinary.js";

export const isRemoteUrl = (value = "") => /^https?:\/\//i.test(String(value).trim());

// builds an absolute URL for local files, passes through remote URLs unchanged
export const resolveStoredFileUrl = (req, filePath = "") => {
    const normalizedPath = String(filePath || "").trim();

    if (!normalizedPath) {
        return null;
    }

    if (isRemoteUrl(normalizedPath)) {
        return normalizedPath;
    }

    const publicPath = normalizedPath.replace(/\\/g, "/").replace(/^\.?\//, "");
    if (!publicPath || !req) {
        return publicPath || null;
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`.replace(/\/+$/, "");
    return `${baseUrl}/${publicPath.replace(/^\/+/, "")}`;
};

export const getUploadedFileUrl = (file) => file?.secure_url || file?.path || null;

export const getUploadedStorageId = (file) =>
    file?.storageId || file?.public_id || file?.filename || null;

// tries multiple resource types when resourceType="auto" because Cloudinary
// requires the correct type to delete an asset
export const destroyCloudinaryAsset = async ({ storageId, resourceType = "image" } = {}) => {
    if (!storageId) {
        return false;
    }

    const resourceTypesToTry =
        resourceType === "auto" || !resourceType
            ? ["raw", "image", "video"]
            : [resourceType];

    try {
        for (const candidateResourceType of resourceTypesToTry) {
            const result = await cloudinary.uploader.destroy(storageId, {
                invalidate: true,
                resource_type: candidateResourceType,
                type: "upload",
            });

            if (result?.result === "ok" || result?.result === "not found") {
                return true;
            }
        }

        return false;
    } catch (error) {
        console.error(`Failed to delete Cloudinary asset ${storageId}:`, error.message);
        return false;
    }
};

// prefers Cloudinary deletion, falls back to local fs unlink for dev environments
export const removeStoredFile = async ({
    filePath,
    storageId,
    resourceType = "image",
} = {}) => {
    if (storageId) {
        return destroyCloudinaryAsset({ storageId, resourceType });
    }

    if (filePath && !isRemoteUrl(filePath) && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
    }

    return false;
};

export const removeStoredFiles = async (items = [], options = {}) => {
    await Promise.all(
        items.map((item) => {
            if (!item) {
                return Promise.resolve(false);
            }

            return removeStoredFile({
                filePath: item.filePath || item.path,
                storageId: item.storageId || item.publicId || item.filename,
                resourceType: item.resourceType || options.resourceType,
            });
        })
    );
};
