import mongoose from "mongoose";

const messageSchema = mongoose.Schema(
    {
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        receiverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        propertyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Property",
            required: true,
        },
        content: {
            type: String,
            trim: true,
            default: "",
        },
        attachment: {
            fileName: String,
            originalName: String,
            filePath: String,
            mimeType: String,
            size: Number,
        },
        isRead: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

messageSchema.index({ senderId: 1, receiverId: 1, propertyId: 1, createdAt: 1 });
messageSchema.index({ receiverId: 1, isRead: 1 });

export default mongoose.model("Message", messageSchema);
