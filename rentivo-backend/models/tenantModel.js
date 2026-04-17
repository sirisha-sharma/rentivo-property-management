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
        unitId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Unit",
            required: true,
        },
        monthlyRent: {
            type: Number,
            required: [true, "Please specify monthly rent"],
        },
        leaseStart: {
            type: Date,
            required: true,
        },
        leaseEnd: {
            type: Date,
            required: true,
        },
        securityDeposit: {
            type: Number,
            default: 0,
            min: 0,
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
