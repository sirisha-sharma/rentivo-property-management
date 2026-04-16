import mongoose from "mongoose";

const maintenanceSchema = mongoose.Schema(
    {
        propertyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Property",
            required: true,
        },
        tenantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Tenant",
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
        },
        priority: {
            type: String,
            enum: ["Low", "Medium", "High"],
            default: "Medium",
        },
        status: {
            type: String,
            enum: ["Open", "Pending", "In Progress", "Resolved"],
            default: "Open",
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("Maintenance", maintenanceSchema);
