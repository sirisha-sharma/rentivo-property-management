import mongoose from "mongoose";
import { OFFICIAL_DISTRICTS } from "../utils/nepalDistricts.js";

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
        district: {
            type: String,
            trim: true,
            enum: OFFICIAL_DISTRICTS,
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
        rent: {
            type: Number,
            default: 0,
        },
        rentPerUnit: {
            type: Boolean,
            default: false,
        },
        description: {
            type: String,
            default: "",
        },
        availableFrom: {
            type: Date,
            default: Date.now,
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

propertySchema.index({ status: 1, district: 1, createdAt: -1 });

export default mongoose.model("Property", propertySchema);
