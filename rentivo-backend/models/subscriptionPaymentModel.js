import mongoose from "mongoose";

// Schema definition for subscriptionpaymentmodel data.

const subscriptionPaymentSchema = mongoose.Schema(
    {
        landlordId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        subscriptionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Subscription",
            required: true,
        },
        plan: {
            type: String,
            enum: ["monthly", "yearly"],
            required: true,
        },
        billingCycle: {
            type: String,
            enum: ["monthly", "yearly"],
            required: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        currency: {
            type: String,
            default: "NPR",
        },
        gateway: {
            type: String,
            enum: ["esewa", "khalti"],
            required: true,
        },
        transactionId: {
            type: String,
            required: true,
            unique: true,
        },
        gatewayReference: {
            type: String,
            unique: true,
            sparse: true,
        },
        status: {
            type: String,
            enum: ["initiated", "pending", "completed", "failed", "cancelled"],
            default: "initiated",
        },
        gatewayResponse: {
            type: mongoose.Schema.Types.Mixed,
        },
        failureReason: {
            type: String,
        },
        paidAt: {
            type: Date,
        },
        appliedAt: {
            type: Date,
        },
        periodStart: {
            type: Date,
        },
        periodEnd: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

subscriptionPaymentSchema.index({ landlordId: 1, createdAt: -1 });

export default mongoose.model("SubscriptionPayment", subscriptionPaymentSchema);
