import mongoose from "mongoose";

// Schema definition for unitmodel data.

const unitSchema = mongoose.Schema(
    {
        propertyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Property",
            required: true,
        },
        unitName: {
            type: String,
            required: [true, "Please add a unit name"],
        },
        floorNumber: {
            type: Number,
        },
        baseRent: {
            type: Number,
        },
        status: {
            type: String,
            enum: ["vacant", "occupied"],
            default: "vacant",
        },
        description: {
            type: String,
            default: "",
        },
        currentTenant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Tenant",
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("Unit", unitSchema);
