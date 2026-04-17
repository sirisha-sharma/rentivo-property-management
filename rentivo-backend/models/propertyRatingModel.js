import mongoose from "mongoose";

// Schema definition for propertyratingmodel data.

const propertyRatingSchema = mongoose.Schema(
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
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        review: {
            type: String,
            default: "",
            trim: true,
            maxlength: 600,
        },
    },
    {
        timestamps: true,
    }
);

propertyRatingSchema.index({ propertyId: 1, userId: 1 }, { unique: true });

export default mongoose.model("PropertyRating", propertyRatingSchema);
