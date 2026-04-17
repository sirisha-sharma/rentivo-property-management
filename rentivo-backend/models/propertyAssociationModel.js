import mongoose from "mongoose";

const propertyAssociationSchema = mongoose.Schema(
    {
        propertyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Property",
            required: true,
            index: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        firstAssociatedAt: {
            type: Date,
            default: Date.now,
        },
        lastAssociatedAt: {
            type: Date,
            default: Date.now,
        },
        endedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

propertyAssociationSchema.index({ propertyId: 1, userId: 1 }, { unique: true });

export default mongoose.model("PropertyAssociation", propertyAssociationSchema);
