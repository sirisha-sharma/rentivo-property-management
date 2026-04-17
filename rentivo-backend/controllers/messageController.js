import mongoose from "mongoose";
import Message from "../models/messageModel.js";
import Property from "../models/propertyModel.js";
import Tenant from "../models/tenantModel.js";
import User from "../models/userModel.js";
import { createNotification } from "./notificationController.js";
import {
    getUploadedFileUrl,
    getUploadedStorageId,
    removeStoredFile,
    resolveStoredFileUrl,
} from "../utils/storage.js";

// Guard against malformed thread/message IDs before hitting database queries.
const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const toIdString = (value) => value?.toString?.() || "";

const cleanupUploadedFile = async (file) => {
    await removeStoredFile({
        filePath: file?.path,
        storageId: getUploadedStorageId(file),
        resourceType: "auto",
    });
};

const serializeMessage = (req, message) => {
    if (!message) return message;

    const serialized = typeof message.toObject === "function" ? message.toObject() : { ...message };

    if (serialized.attachment?.filePath) {
        serialized.attachment = {
            ...serialized.attachment,
            fileUrl: resolveStoredFileUrl(req, serialized.attachment.filePath),
        };
    }

    return serialized;
};

const buildMessagePreview = (message) => {
    const trimmedContent = message.content?.trim();

    if (trimmedContent) {
        return trimmedContent.length > 60
            ? `${trimmedContent.substring(0, 60)}...`
            : trimmedContent;
    }

    if (message.attachment?.originalName) {
        return `Sent an attachment: ${message.attachment.originalName}`;
    }

    return "New message";
};

const resolveConversationAccess = async ({ currentUserId, otherUserId, propertyId }) => {
    if (!isValidObjectId(otherUserId) || !isValidObjectId(propertyId)) {
        return {
            error: {
                status: 400,
                message: "Invalid user or property id",
            },
        };
    }

    const currentUserIdStr = toIdString(currentUserId);
    const otherUserIdStr = toIdString(otherUserId);

    if (currentUserIdStr === otherUserIdStr) {
        return {
            error: {
                status: 400,
                message: "You cannot message yourself",
            },
        };
    }

    const property = await Property.findById(propertyId).populate("landlordId", "name email role");
    if (!property || !property.landlordId) {
        return {
            error: {
                status: 404,
                message: "Property not found",
            },
        };
    }

    const landlordIdStr = toIdString(property.landlordId._id);

    if (landlordIdStr === currentUserIdStr) {
        const tenantRecord = await Tenant.findOne({
            propertyId,
            userId: otherUserId,
            status: "Active",
        }).populate("userId", "name email role");

        if (!tenantRecord?.userId) {
            return {
                error: {
                    status: 403,
                    message: "You can only message active tenants of this property",
                },
            };
        }

        return {
            property,
            landlord: property.landlordId,
            tenantRecord,
            otherUser: tenantRecord.userId,
            currentRole: "landlord",
        };
    }

    if (landlordIdStr === otherUserIdStr) {
        const tenantRecord = await Tenant.findOne({
            propertyId,
            userId: currentUserId,
            status: "Active",
        }).populate("userId", "name email role");

        if (!tenantRecord?.userId) {
            return {
                error: {
                    status: 403,
                    message: "You can only message the landlord of your active rental",
                },
            };
        }

        return {
            property,
            landlord: property.landlordId,
            tenantRecord,
            otherUser: property.landlordId,
            currentRole: "tenant",
        };
    }

    return {
        error: {
            status: 403,
            message: "Messaging is only available between a landlord and their tenant",
        },
    };
};

export const getAllowedContacts = async (req, res) => {
    try {
        const userId = req.user._id;
        const contacts = [];

        if (req.user.role === "landlord") {
            const tenantRecords = await Tenant.find({
                status: "Active",
                userId: { $ne: null },
                propertyId: { $ne: null },
            })
                .populate("userId", "name email")
                .populate({
                    path: "propertyId",
                    select: "title landlordId",
                    match: { landlordId: userId },
                });

            tenantRecords.forEach((tenantRecord) => {
                if (!tenantRecord.userId || !tenantRecord.propertyId) return;

                contacts.push({
                    otherUserId: tenantRecord.userId._id,
                    otherUserName: tenantRecord.userId.name,
                    otherUserEmail: tenantRecord.userId.email,
                    propertyId: tenantRecord.propertyId._id,
                    propertyTitle: tenantRecord.propertyId.title,
                    threadId: `${tenantRecord.userId._id}_${tenantRecord.propertyId._id}`,
                });
            });
        } else {
            const tenantRecords = await Tenant.find({
                status: "Active",
                userId,
                propertyId: { $ne: null },
            }).populate({
                path: "propertyId",
                select: "title landlordId",
                populate: {
                    path: "landlordId",
                    select: "name email",
                },
            });

            tenantRecords.forEach((tenantRecord) => {
                const landlord = tenantRecord.propertyId?.landlordId;
                if (!tenantRecord.propertyId || !landlord) return;

                contacts.push({
                    otherUserId: landlord._id,
                    otherUserName: landlord.name,
                    otherUserEmail: landlord.email,
                    propertyId: tenantRecord.propertyId._id,
                    propertyTitle: tenantRecord.propertyId.title,
                    threadId: `${landlord._id}_${tenantRecord.propertyId._id}`,
                });
            });
        }

        contacts.sort((a, b) => {
            if (a.otherUserName !== b.otherUserName) {
                return a.otherUserName.localeCompare(b.otherUserName);
            }

            return (a.propertyTitle || "").localeCompare(b.propertyTitle || "");
        });

        res.json(contacts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Groups messages by (otherUser + property) to build one conversation entry per thread
export const getConversations = async (req, res) => {
    try {
        const userId = req.user._id;
        const userIdStr = toIdString(userId);

        const messages = await Message.find({
            $or: [{ senderId: userId }, { receiverId: userId }],
        })
            .sort({ createdAt: -1 })
            .populate("senderId", "name email")
            .populate("receiverId", "name email")
            .populate("propertyId", "title");

        const seen = new Map();

        for (const message of messages) {
            if (!message.senderId || !message.receiverId || !message.propertyId) continue;

            const senderIdStr = toIdString(message.senderId._id);
            const otherUser = senderIdStr === userIdStr ? message.receiverId : message.senderId;
            const key = `${otherUser._id}_${message.propertyId._id}`;

            if (!seen.has(key)) {
                seen.set(key, {
                    otherUserId: otherUser._id,
                    otherUserName: otherUser.name,
                    propertyId: message.propertyId._id,
                    propertyTitle: message.propertyId.title,
                    lastMessage: buildMessagePreview(message),
                    lastMessageAt: message.createdAt,
                    unreadCount: 0,
                    hasAttachment: Boolean(message.attachment?.filePath),
                });
            }
        }

        const unreadMessages = await Message.find({
            receiverId: userId,
            isRead: false,
        }).select("senderId propertyId");

        unreadMessages.forEach((message) => {
            const key = `${message.senderId}_${message.propertyId}`;
            if (seen.has(key)) {
                seen.get(key).unreadCount += 1;
            }
        });

        res.json(Array.from(seen.values()));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getMessages = async (req, res) => {
    try {
        const userId = req.user._id;
        const { otherUserId, propertyId } = req.params;

        const access = await resolveConversationAccess({
            currentUserId: userId,
            otherUserId,
            propertyId,
        });

        if (access.error) {
            return res.status(access.error.status).json({ message: access.error.message });
        }

        const messages = await Message.find({
            propertyId,
            $or: [
                { senderId: userId, receiverId: otherUserId },
                { senderId: otherUserId, receiverId: userId },
            ],
        })
            .sort({ createdAt: 1 })
            .populate("senderId", "name");

        res.json(messages.map((message) => serializeMessage(req, message)));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Cleans up the uploaded file if access check or DB write fails
export const sendMessage = async (req, res) => {
    const attachmentFile = req.file;

    try {
        const senderId = req.user._id;
        const { receiverId, propertyId } = req.body;
        const content = req.body.content?.trim() || "";

        if (!receiverId || !propertyId || (!content && !attachmentFile)) {
            await cleanupUploadedFile(attachmentFile);
            return res.status(400).json({
                message: "receiverId, propertyId, and either content or an attachment are required",
            });
        }

        const access = await resolveConversationAccess({
            currentUserId: senderId,
            otherUserId: receiverId,
            propertyId,
        });

        if (access.error) {
            await cleanupUploadedFile(attachmentFile);
            return res.status(access.error.status).json({ message: access.error.message });
        }

        const message = await Message.create({
            senderId,
            receiverId,
            propertyId,
            content,
            attachment: attachmentFile
                ? {
                    fileName: attachmentFile.filename,
                    originalName: attachmentFile.originalname,
                    filePath: getUploadedFileUrl(attachmentFile),
                    storageId: getUploadedStorageId(attachmentFile),
                    mimeType: attachmentFile.mimetype,
                    size: attachmentFile.size,
                }
                : undefined,
        });

        const sender = await User.findById(senderId).select("name");
        await createNotification(
            receiverId,
            "general",
            `New message from ${sender?.name || "someone"}: "${buildMessagePreview(message)}"`
        );

        const populated = await Message.findById(message._id).populate("senderId", "name");
        res.status(201).json(serializeMessage(req, populated));
    } catch (error) {
        await cleanupUploadedFile(attachmentFile);
        res.status(500).json({ message: error.message });
    }
};

export const markThreadAsRead = async (req, res) => {
    try {
        const userId = req.user._id;
        const { otherUserId, propertyId } = req.params;

        const access = await resolveConversationAccess({
            currentUserId: userId,
            otherUserId,
            propertyId,
        });

        if (access.error) {
            return res.status(access.error.status).json({ message: access.error.message });
        }

        await Message.updateMany(
            { senderId: otherUserId, receiverId: userId, propertyId, isRead: false },
            { isRead: true }
        );

        res.json({ message: "Messages marked as read" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getUnreadCount = async (req, res) => {
    try {
        const count = await Message.countDocuments({
            receiverId: req.user._id,
            isRead: false,
        });
        res.json({ count });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
