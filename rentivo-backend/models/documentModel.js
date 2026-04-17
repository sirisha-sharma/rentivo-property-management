import mongoose from "mongoose";

// Schema definition for documentmodel data.

const documentSchema = mongoose.Schema(
    {
        propertyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Property",
            required: true,
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            enum: ["Lease Agreement", "ID Proof", "Other"],
            required: true,
        },
        fileName: {
            type: String,
            required: true,
        },
        filePath: {
            type: String,
            required: true,
        },
        storageId: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("Document", documentSchema);
