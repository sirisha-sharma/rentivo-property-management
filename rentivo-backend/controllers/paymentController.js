import Payment from "../models/paymentModel.js";
import Invoice from "../models/invoiceModel.js";
import Tenant from "../models/tenantModel.js";
import { initializeEsewaPayment, verifyEsewaSignature } from "../payment/gateways/esewaGateway.js";
import { initializeKhaltiPayment, verifyKhaltiPayment as khaltiLookup } from "../payment/gateways/khaltiGateway.js";
import { createNotification } from "./notificationController.js";

const buildRedirectUrl = (path, params = {}) => {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            searchParams.set(key, value.toString());
        }
    });

    const query = searchParams.toString();
    return query ? `/${path}?${query}` : `/${path}`;
};

const finalizeOnlinePayment = async ({
    payment,
    gatewayResponse,
    paidAmount,
    gatewayLabel,
}) => {
    const wasCompleted = payment.status === "completed";

    payment.status = "completed";
    payment.gatewayResponse = gatewayResponse;
    await payment.save();

    const invoice = await Invoice.findById(payment.invoiceId);

    let invoiceUpdated = false;
    if (invoice) {
        if (invoice.status !== "Paid") {
            invoice.status = "Paid";
            invoiceUpdated = true;
        }

        if (!invoice.paidDate) {
            invoice.paidDate = new Date();
            invoiceUpdated = true;
        }

        if (invoiceUpdated) {
            await invoice.save();
            console.log(`Invoice ${invoice.invoiceNumber || invoice._id} marked as Paid`);
        }
    }

    if (!wasCompleted || invoiceUpdated) {
        await createNotification(
            payment.userId,
            "payment",
            `Your ${gatewayLabel} payment of NPR ${paidAmount} has been confirmed. Your invoice has been marked as Paid.`
        );

        if (invoice?.landlordId) {
            await createNotification(
                invoice.landlordId,
                "payment",
                `Rent payment of NPR ${paidAmount} received via ${gatewayLabel} from your tenant.`
            );
        }
    }

    return invoice;
};

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
        const customerInfo = {
            name: req.user.name,
            email: req.user.email,
            phone: req.user.phone || "9800000000",
        };

        if (gateway === "esewa") {
            gatewayResponse = initializeEsewaPayment(
                invoice.amount,
                transactionId,
                invoiceId
            );
        } else if (gateway === "khalti") {
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

        // Notify the tenant that a payment session has started.
        // Silent-fail: email failures must never break payment initiation.
        try {
            const gatewayLabel = gateway === "esewa" ? "eSewa" : "Khalti";
            await createNotification(
                req.user._id,
                "payment",
                `Payment of NPR ${invoice.amount} via ${gatewayLabel} has been initiated for invoice ${invoice.invoiceNumber || invoice._id}. Complete the payment in the opened page.`
            );
        } catch (notifyError) {
            console.error(
                "Failed to send payment initiation notification:",
                notifyError.message
            );
        }

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
            .populate({
                path: "invoiceId",
                populate: {
                    path: "propertyId",
                    select: "title",
                },
            })
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
            const payment = await Payment.findOneAndUpdate(
                { transactionId: txnId },
                {
                    status: "failed",
                    failureReason: "Payment cancelled or failed by user",
                },
                { new: true }
            );

            if (payment) {
                await createNotification(
                    payment.userId,
                    "payment",
                    "Your payment was cancelled or could not be processed. Please try again."
                );
            }
        }

        return res.redirect(
            buildRedirectUrl("payment-failed", {
                txn: txnId,
                reason: "cancelled",
            })
        );
    } catch (error) {
        console.error("Payment failure handler error:", error);
        return res.redirect(
            buildRedirectUrl("payment-failed", { reason: "server_error" })
        );
    }
};

/**
 * @desc    Verify eSewa payment
 * @route   GET /api/payments/esewa/verify
 * @access  Public (Payment gateway callback)
 *
 * IMPORTANT: Every code path MUST redirect (not return JSON) so the
 * mobile WebView can detect the result via URL inspection.
 */
export const verifyEsewaPayment = async (req, res) => {
    try {
        const { data } = req.query;

        if (!data) {
            console.error("eSewa verification failed: No data parameter");
            return res.redirect(
                buildRedirectUrl("payment-failed", {
                    reason: "no_data",
                    gateway: "esewa",
                })
            );
        }

        let decodedData;
        try {
            decodedData = JSON.parse(Buffer.from(data, "base64").toString("utf-8"));
        } catch (error) {
            console.error("eSewa verification failed: Invalid base64 data", error);
            return res.redirect(
                buildRedirectUrl("payment-failed", {
                    reason: "invalid_data",
                    gateway: "esewa",
                })
            );
        }

        const {
            transaction_code,
            status,
            total_amount,
            transaction_uuid,
            product_code,
            signed_field_names,
            signature
        } = decodedData;

        console.log("eSewa callback received:", {
            transaction_code,
            status,
            total_amount,
            transaction_uuid,
        });

        if (status !== "COMPLETE") {
            console.log(`eSewa payment not complete. Status: ${status}`);
            return res.redirect(
                buildRedirectUrl("payment-failed", {
                    status,
                    txn: transaction_uuid,
                    gateway: "esewa",
                })
            );
        }

        const payment = await Payment.findOne({ transactionId: transaction_uuid });

        if (!payment) {
            console.error(`Payment record not found for transaction: ${transaction_uuid}`);
            return res.redirect(
                buildRedirectUrl("payment-failed", {
                    reason: "not_found",
                    txn: transaction_uuid,
                    gateway: "esewa",
                })
            );
        }

        // Verify signature (uses actual signed_field_names from response)
        try {
            const expectedSignature = verifyEsewaSignature(decodedData);

            if (signature !== expectedSignature) {
                console.error("eSewa signature verification failed", {
                    received: signature,
                    expected: expectedSignature,
                    signed_field_names,
                    decodedData,
                });

                payment.status = "failed";
                payment.failureReason = "Signature verification failed";
                payment.gatewayResponse = decodedData;
                await payment.save();

                await createNotification(
                    payment.userId,
                    "payment",
                    "Your eSewa payment could not be verified. Please try again or contact support."
                );

                return res.redirect(
                    buildRedirectUrl("payment-failed", {
                        reason: "signature_mismatch",
                        txn: transaction_uuid,
                        gateway: "esewa",
                    })
                );
            }
        } catch (error) {
            console.error("Error verifying eSewa signature:", error);
            payment.status = "failed";
            payment.failureReason = "Signature verification error";
            payment.gatewayResponse = decodedData;
            await payment.save();

            return res.redirect(
                buildRedirectUrl("payment-failed", {
                    reason: "verification_error",
                    txn: transaction_uuid,
                    gateway: "esewa",
                })
            );
        }

        // Verify amount
        if (Math.abs(parseFloat(total_amount) - payment.amount) > 0.01) {
            console.error("Amount mismatch", {
                expected: payment.amount,
                received: total_amount,
            });

            payment.status = "failed";
            payment.failureReason = "Amount mismatch";
            payment.gatewayResponse = decodedData;
            await payment.save();

            return res.redirect(
                buildRedirectUrl("payment-failed", {
                    reason: "amount_mismatch",
                    txn: transaction_uuid,
                    gateway: "esewa",
                })
            );
        }

        await finalizeOnlinePayment({
            payment,
            gatewayResponse: decodedData,
            paidAmount: total_amount,
            gatewayLabel: "eSewa",
        });

        console.log(`✓ eSewa payment verified successfully: ${transaction_uuid}`);

        return res.redirect(
            buildRedirectUrl("payment-success", {
                txn: transaction_uuid,
                amount: total_amount,
                invoice: payment.invoiceId,
                gateway: "esewa",
            })
        );
    } catch (error) {
        console.error("eSewa verification error:", error);
        return res.redirect(
            buildRedirectUrl("payment-failed", {
                reason: "server_error",
                gateway: "esewa",
            })
        );
    }
};

/**
 * @desc    Verify Khalti payment
 * @route   POST /api/payments/khalti/verify (or GET with query params)
 * @access  Public (Payment gateway callback)
 *
 * IMPORTANT: Every code path MUST redirect (not return JSON) so the
 * mobile WebView can detect the result via URL inspection.
 */
export const verifyKhaltiPayment = async (req, res) => {
    try {
        const { pidx, txnId, amount, mobile, purchase_order_id, purchase_order_name, transaction_id } =
            req.method === 'GET' ? req.query : req.body;

        if (!pidx) {
            console.error("Khalti verification failed: No pidx parameter");
            return res.redirect(
                buildRedirectUrl("payment-failed", {
                    reason: "no_pidx",
                    gateway: "khalti",
                })
            );
        }

        console.log("Khalti callback received:", {
            pidx,
            txnId: txnId || transaction_id,
            amount,
            purchase_order_id,
        });

        let lookupResult;
        try {
            lookupResult = await khaltiLookup(pidx);
        } catch (error) {
            console.error("Khalti lookup API failed:", error.message);
            return res.redirect(
                buildRedirectUrl("payment-failed", {
                    reason: "lookup_failed",
                    gateway: "khalti",
                })
            );
        }

        console.log("Khalti lookup result:", lookupResult);

        const transactionId = purchase_order_id || lookupResult.purchase_order_id;

        if (!transactionId) {
            console.error("Transaction ID not found in Khalti response");
            return res.redirect(
                buildRedirectUrl("payment-failed", {
                    reason: "no_txn_id",
                    gateway: "khalti",
                })
            );
        }

        const payment = await Payment.findOne({ transactionId });

        if (!payment) {
            console.error(`Payment record not found for transaction: ${transactionId}`);
            return res.redirect(
                buildRedirectUrl("payment-failed", {
                    reason: "not_found",
                    txn: transactionId,
                    gateway: "khalti",
                })
            );
        }

        // Already processed — ensure invoice is marked Paid and redirect
        if (payment.status === "completed") {
            console.log(`Payment already processed: ${transactionId}`);
            await finalizeOnlinePayment({
                payment,
                gatewayResponse: lookupResult,
                paidAmount: lookupResult.total_amount / 100,
                gatewayLabel: "Khalti",
            });

            return res.redirect(
                buildRedirectUrl("payment-success", {
                    txn: transactionId,
                    amount: lookupResult.total_amount / 100,
                    invoice: payment.invoiceId,
                    gateway: "khalti",
                })
            );
        }

        // Check Khalti payment status
        if (lookupResult.status !== "Completed") {
            console.log(`Khalti payment not completed. Status: ${lookupResult.status}`);

            payment.status = lookupResult.status === "Pending" ? "pending" : "failed";
            payment.failureReason = `Khalti status: ${lookupResult.status}`;
            payment.gatewayResponse = lookupResult;
            await payment.save();

            if (payment.status === "failed") {
                await createNotification(
                    payment.userId,
                    "payment",
                    "Your Khalti payment could not be completed. Please try again."
                );
            }

            return res.redirect(
                buildRedirectUrl("payment-failed", {
                    status: lookupResult.status,
                    txn: transactionId,
                    gateway: "khalti",
                })
            );
        }

        // Verify amount (Khalti returns amount in paisa)
        const paidAmount = lookupResult.total_amount / 100;
        if (Math.abs(paidAmount - payment.amount) > 0.01) {
            console.error("Amount mismatch", {
                expected: payment.amount,
                received: paidAmount,
            });

            payment.status = "failed";
            payment.failureReason = "Amount mismatch";
            payment.gatewayResponse = lookupResult;
            await payment.save();

            return res.redirect(
                buildRedirectUrl("payment-failed", {
                    reason: "amount_mismatch",
                    txn: transactionId,
                    gateway: "khalti",
                })
            );
        }

        await finalizeOnlinePayment({
            payment,
            gatewayResponse: lookupResult,
            paidAmount,
            gatewayLabel: "Khalti",
        });

        console.log(`✓ Khalti payment verified successfully: ${transactionId}`);

        return res.redirect(
            buildRedirectUrl("payment-success", {
                txn: transactionId,
                amount: paidAmount,
                invoice: payment.invoiceId,
                gateway: "khalti",
            })
        );
    } catch (error) {
        console.error("Khalti verification error:", error);
        return res.redirect(
            buildRedirectUrl("payment-failed", {
                reason: "server_error",
                gateway: "khalti",
            })
        );
    }
};
