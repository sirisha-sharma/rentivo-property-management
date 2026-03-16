import mongoose from "mongoose";

const paymentSchema = mongoose.Schema(
    {
        invoiceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Invoice",
            required: true,
        },
        tenantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Tenant",
            required: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        gateway: {
            type: String,
            enum: ["esewa", "khalti", "fonepay"],
            required: true,
        },
        transactionId: {
            type: String,
            unique: true,
            sparse: true,
        },
        status: {
            type: String,
            enum: ["initiated", "pending", "completed", "failed", "refunded"],
            default: "initiated",
        },
        gatewayResponse: {
            type: mongoose.Schema.Types.Mixed,
        },
    },
    {
        timestamps: true,
    }
);

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
