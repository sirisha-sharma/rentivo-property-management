import mongoose from "mongoose";

// Schema definition for subscriptionmodel data.

const subscriptionSchema = mongoose.Schema(
    {
        landlordId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },
        plan: {
            type: String,
            enum: ["trial", "monthly", "yearly"],
            default: "trial",
        },
        status: {
            type: String,
            enum: ["trialing", "active", "expired", "cancelled", "pending_payment"],
            default: "trialing",
        },
        billingCycle: {
            type: String,
            enum: ["trial", "monthly", "yearly"],
            default: "trial",
        },
        startDate: {
            type: Date,
            required: true,
            default: Date.now,
        },
        endDate: {
            type: Date,
            required: true,
        },
        paymentStatus: {
            type: String,
            enum: ["not_required", "pending", "paid", "failed"],
            default: "not_required",
        },
        paymentReference: {
            type: String,
            trim: true,
        },
        gateway: {
            type: String,
            enum: ["esewa", "khalti"],
        },
        cancelledAt: {
            type: Date,
        },
        expiryReminderSentAt: {
            type: Date,
        },
        expiryReminderForDate: {
            type: Date,
        },
        expiredNotificationSentAt: {
            type: Date,
        },
        expiredNotificationForDate: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("Subscription", subscriptionSchema);
