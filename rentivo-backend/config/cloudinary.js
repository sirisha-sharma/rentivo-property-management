import { v2 as cloudinary } from "cloudinary";

let cloudinaryConfigured = false;

const getCloudinaryConfig = () => ({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const hasCloudinaryConfig = () => Object.values(getCloudinaryConfig()).every(Boolean);

export const ensureCloudinaryConfig = () => {
    if (!hasCloudinaryConfig()) {
        const error = new Error(
            "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
        );
        error.statusCode = 500;
        throw error;
    }

    if (cloudinaryConfigured) {
        return;
    }

    cloudinary.config(getCloudinaryConfig());
    cloudinaryConfigured = true;
};

export default cloudinary;
