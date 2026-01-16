import mongoose from "mongoose";

const tenantSchema = mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        propertyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Property",
            required: true,
        },
        leaseStart: {
            type: Date,
            required: true,
        },
        leaseEnd: {
            type: Date,
            required: true,
        },
        status: {
            type: String,
            enum: ["Active", "Past", "Pending"],
            default: "Pending",
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("Tenant", tenantSchema);
