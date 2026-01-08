import mongoose from "mongoose";

const propertySchema = mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Please add a property title"],
        },
        address: {
            type: String,
            required: [true, "Please add an address"],
        },
        type: {
            type: String,
            required: [true, "Please specify property type"],
        },
        units: {
            type: Number,
            required: [true, "Please add number of units"],
        },
        status: {
            type: String,
            enum: ["occupied", "vacant", "maintenance"],
            default: "vacant",
        },
        splitMethod: {
            type: String,
            enum: ["equal", "room-size", "occupancy", "custom"],
            default: "equal",
        },
        roomSizes: [{
            name: String,
            size: Number
        }],
        amenities: {
            type: [String],
            default: [],
        },
        images: {
            type: [String],
            default: [],
        },
        landlordId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "User",
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("Property", propertySchema);
