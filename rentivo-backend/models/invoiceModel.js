import mongoose from "mongoose";

const invoiceSchema = mongoose.Schema(
    {
        tenantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Tenant", // Referencing Tenant model as per plan
            required: true,
        },
        propertyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Property",
            required: true,
        },
        landlordId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        type: {
            type: String,
            enum: ["Rent", "Maintenance", "Utilities", "Other"],
            required: true,
        },
        dueDate: {
            type: Date,
            required: true,
        },
        status: {
            type: String,
            enum: ["Pending", "Paid", "Overdue"],
            default: "Pending",
        },
        description: {
            type: String,
        },
        breakdown: {
            baseRent: {
                type: Number,
                default: 0
            },
            utilities: {
                electricity: {
                    type: Number,
                    default: 0
                },
                water: {
                    type: Number,
                    default: 0
                },
                internet: {
                    type: Number,
                    default: 0
                },
                gas: {
                    type: Number,
                    default: 0
                },
                waste: {
                    type: Number,
                    default: 0
                },
                other: {
                    type: Number,
                    default: 0
                }
            },
            totalUtilities: {
                type: Number,
                default: 0
            }
        },
        paidDate: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("Invoice", invoiceSchema);
