import Payment from "../models/paymentModel.js";
import Invoice from "../models/invoiceModel.js";
import Tenant from "../models/tenantModel.js";
import { initializeEsewaPayment } from "../payment/gateways/esewaGateway.js";
import { initializeKhaltiPayment } from "../payment/gateways/khaltiGateway.js";

/**
 * @desc    Initiate payment for an invoice
 * @route   POST /api/payments/initiate
 * @access  Private (Tenant only)
 */
export const initiatePayment = async (req, res) => {
    try {
        const { invoiceId, gateway } = req.body;

        // Validate gateway
        if (!["esewa", "khalti"].includes(gateway)) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment gateway. Choose: esewa or khalti"
            });
        }

        // Fetch invoice
        const invoice = await Invoice.findById(invoiceId)
            .populate("tenantId")
            .populate("propertyId");

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: "Invoice not found"
            });
        }

        // Verify tenant owns this invoice
        const tenant = await Tenant.findById(invoice.tenantId);
        if (!tenant || tenant.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to pay this invoice"
            });
        }

        // Check if invoice is already paid
        if (invoice.status === "Paid") {
            return res.status(400).json({
                success: false,
                message: "Invoice is already paid"
            });
        }

        // Generate unique transaction ID
        const transactionId = `RENTIVO_${Date.now()}_${invoiceId.toString().slice(-6)}`;

        // Initialize payment with selected gateway
        let gatewayResponse;

        if (gateway === "esewa") {
            gatewayResponse = initializeEsewaPayment(
                invoice.amount,
                transactionId,
                invoiceId
            );
        } else if (gateway === "khalti") {
            const customerInfo = {
                name: req.user.name,
                email: req.user.email,
                phone: req.user.phone || "9800000000",
            };
            gatewayResponse = await initializeKhaltiPayment(
                invoice.amount,
                transactionId,
                invoiceId,
                customerInfo
            );
        }

        // Create payment record in database
        const payment = await Payment.create({
            invoiceId: invoice._id,
            tenantId: invoice.tenantId,
            userId: req.user._id,
            amount: invoice.amount,
            gateway,
            transactionId,
            status: "initiated",
        });

        res.status(200).json({
            success: true,
            message: "Payment initiated successfully",
            payment: {
                paymentId: payment._id,
                transactionId,
                amount: invoice.amount,
                gateway,
            },
            gatewayData: gatewayResponse,
        });

    } catch (error) {
        console.error("Payment initiation error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Payment initiation failed"
        });
    }
};

/**
 * @desc    Get payment gateway configurations
 * @route   GET /api/payments/config
 * @access  Private
 */
export const getPaymentConfig = async (req, res) => {
    try {
        res.status(200).json({
            success: true,
            availableGateways: ["esewa", "khalti"],
            defaultGateway: "esewa",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch payment configuration"
        });
    }
};

/**
 * @desc    Get payment history for user
 * @route   GET /api/payments/history
 * @access  Private
 */
export const getPaymentHistory = async (req, res) => {
    try {
        const payments = await Payment.find({ userId: req.user._id })
            .populate("invoiceId")
            .sort({ createdAt: -1 })
            .limit(50);

        res.status(200).json({
            success: true,
            count: payments.length,
            payments,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch payment history"
        });
    }
};

/**
 * @desc    Get payment by ID
 * @route   GET /api/payments/:id
 * @access  Private
 */
export const getPaymentById = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id)
            .populate("invoiceId")
            .populate("tenantId");

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: "Payment not found"
            });
        }

        // Verify authorization
        if (payment.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to view this payment"
            });
        }

        res.status(200).json({
            success: true,
            payment,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch payment"
        });
    }
};

/**
 * @desc    Handle payment failure
 * @route   GET /api/payments/failure
 * @access  Public (Payment gateway callback)
 */
export const handlePaymentFailure = async (req, res) => {
    try {
        const { transaction_uuid, transactionId, PRN } = req.query;
        const txnId = transaction_uuid || transactionId || PRN;

        if (txnId) {
            // Update payment status to failed
            await Payment.findOneAndUpdate(
                { transactionId: txnId },
                {
                    status: "failed",
                    failureReason: "Payment cancelled or failed by user",
                }
            );
        }

        // Redirect to frontend failure page (will be implemented later)
        res.redirect(`/payment-failed?txn=${txnId}`);
    } catch (error) {
        console.error("Payment failure handler error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to process payment failure"
        });
    }
};

/**
 * @desc    Verify eSewa payment (Placeholder for next step)
 * @route   GET /api/payments/esewa/verify
 * @access  Public (Payment gateway callback)
 */
export const verifyEsewaPayment = async (req, res) => {
    res.status(501).json({
        success: false,
        message: "eSewa verification - To be implemented in Payment Processing & Verification step"
    });
};

/**
 * @desc    Verify Khalti payment (Placeholder for next step)
 * @route   POST /api/payments/khalti/verify
 * @access  Public (Payment gateway callback)
 */
export const verifyKhaltiPayment = async (req, res) => {
    res.status(501).json({
        success: false,
        message: "Khalti verification - To be implemented in Payment Processing & Verification step"
    });
};
