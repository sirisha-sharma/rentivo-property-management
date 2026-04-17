import mongoose from "mongoose";

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
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("Unit", unitSchema);
