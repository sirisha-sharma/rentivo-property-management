import multer from "multer";
import path from "path";
import fs from "fs";

// Create uploads folder if it doesn't exist
const uploadDir = "uploads/documents";
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    },
});

const fileFilter = (req, file, cb) => {
    const allowed = [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error("Only PDF, images, and Word documents are allowed"), false);
    }
};

export const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

// ==================== Property Image Upload Configuration ====================

// Create uploads/properties folder if it doesn't exist
const propertyImageDir = "uploads/properties";
if (!fs.existsSync(propertyImageDir)) {
    fs.mkdirSync(propertyImageDir, { recursive: true });
}

const propertyImageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, propertyImageDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `property-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    },
});

const imageFileFilter = (req, file, cb) => {
    const allowedImages = [".jpg", ".jpeg", ".png", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedImages.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error("Only image files (.jpg, .jpeg, .png, .webp) are allowed"), false);
    }
};

export const uploadPropertyImages = multer({
    storage: propertyImageStorage,
    fileFilter: imageFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max per image
});
