import Payment from "../models/paymentModel.js";
import Invoice from "../models/invoiceModel.js";
import Tenant from "../models/tenantModel.js";
import jwt from "jsonwebtoken";
import {
    bookEsewaIntentPayment,
    checkEsewaIntentPaymentStatus,
    checkEsewaTransactionStatus,
    getEsewaMerchantId,
    getEsewaIntentProductCode,
    initializeEsewaPayment,
    verifyEsewaIntentSignature,
    verifyEsewaSignature,
} from "../payment/gateways/esewaGateway.js";
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

const escapeHtmlAttribute = (value) =>
    String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

const createEsewaLaunchToken = (paymentId) =>
    jwt.sign({ paymentId }, process.env.JWT_SECRET, { expiresIn: "15m" });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableEsewaStatus = (status) =>
    ["PENDING", "AMBIGUOUS", "NOT_FOUND"].includes(status);

const createEsewaTransactionId = (invoiceId) => {
    const compactTimestamp = Date.now().toString(36);
    const invoiceSuffix = invoiceId.toString().slice(-4).toLowerCase();
    return `rtv-${compactTimestamp}-${invoiceSuffix}`;
};

const isTerminalEsewaIntentStatus = (status) =>
    ["SUCCESS", "FAILED", "CANCELED", "REVERTED"].includes(status);

const isMobileEsewaBrowser = (userAgent = "") =>
    /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent) && !/wv|Flutter/i.test(userAgent);

const isEsewaIntentEnabled = () =>
    String(process.env.ESEWA_ENABLE_INTENT || "")
        .trim()
        .toLowerCase() === "true";

const getPublicBaseUrl = () =>
    (process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`)
        .trim()
        .replace(/\/+$/, "");

const mergeGatewayResponse = (existing, patch) => {
    const base =
        existing && typeof existing === "object" && !Array.isArray(existing) ? existing : {};
    return { ...base, ...patch };
};

const getEsewaIntentState = (payment) =>
    payment?.gatewayResponse?.channel === "intent" ? payment.gatewayResponse : null;

const buildEsewaIntentGatewayResponse = (payment, patch = {}) => {
    const existing = getEsewaIntentState(payment) || {};

    return mergeGatewayResponse(existing, {
        channel: "intent",
        product_code:
            patch.product_code || existing.product_code || getEsewaIntentProductCode(),
        transaction_uuid: payment.transactionId,
        amount: Number(patch.amount ?? existing.amount ?? payment.amount),
        booking_id: patch.booking_id || existing.booking_id,
        correlation_id: patch.correlation_id || existing.correlation_id,
        deeplink: patch.deeplink || existing.deeplink,
        reference_code: patch.reference_code || existing.reference_code,
        status: patch.status || existing.status,
        updated_at: patch.updated_at || new Date().toISOString(),
    });
};

const updateEsewaIntentFailure = async (payment, gatewayResponse, status) => {
    const alreadyFailed = payment.status === "failed";

    payment.status = "failed";
    payment.failureReason = `eSewa intent status: ${status}`;
    payment.gatewayResponse = gatewayResponse;
    await payment.save();

    if (!alreadyFailed) {
        await createNotification(
            payment.userId,
            "payment",
            "Your eSewa payment could not be completed. Please try again."
        );
    }
};

const reconcileEsewaStatus = async ({
    payment,
    transactionId,
    totalAmount,
    productCode,
}) => {
    let latestStatus = null;

    for (let attempt = 0; attempt < 2; attempt++) {
        latestStatus = await checkEsewaTransactionStatus({
            transactionUuid: transactionId,
            totalAmount,
            productCode,
        });

        if (latestStatus?.status === "COMPLETE") {
            if (payment) {
                await finalizeOnlinePayment({
                    payment,
                    gatewayResponse: latestStatus,
                    paidAmount: latestStatus.total_amount || totalAmount,
                    gatewayLabel: "eSewa",
                });
            }

            return latestStatus;
        }

        if (!isRetryableEsewaStatus(latestStatus?.status) || attempt === 1) {
            return latestStatus;
        }

        await sleep(1500);
    }

    return latestStatus;
};

const reconcileEsewaIntentStatus = async (payment) => {
    const intentState = getEsewaIntentState(payment);

    if (!payment || !intentState?.booking_id || !intentState?.correlation_id) {
        return null;
    }

    const statusResult = await checkEsewaIntentPaymentStatus({
        bookingId: intentState.booking_id,
        correlationId: intentState.correlation_id,
        productCode: intentState.product_code,
    });

    const latestStatus = statusResult?.data || {};
    const gatewayResponse = buildEsewaIntentGatewayResponse(payment, latestStatus);
    const normalizedStatus = gatewayResponse.status;

    if (normalizedStatus === "SUCCESS") {
        await finalizeOnlinePayment({
            payment,
            gatewayResponse,
            paidAmount: gatewayResponse.amount,
            gatewayLabel: "eSewa",
        });

        return gatewayResponse;
    }

    if (isTerminalEsewaIntentStatus(normalizedStatus)) {
        await updateEsewaIntentFailure(payment, gatewayResponse, normalizedStatus);
        return gatewayResponse;
    }

    if (payment.status !== "completed") {
        payment.status = "pending";
        payment.failureReason = undefined;
        payment.gatewayResponse = gatewayResponse;
        await payment.save();
    }

    return gatewayResponse;
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

        // eSewa accepts only alphanumeric and hyphen characters, and its
        // sandbox behaves more reliably with shorter transaction UUIDs.
        const transactionId =
            gateway === "esewa"
                ? createEsewaTransactionId(invoiceId)
                : `RENTIVO-${Date.now()}-${invoiceId.toString().slice(-6)}`;

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
                transactionId
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

        const baseUrl = getPublicBaseUrl();
        const esewaLaunchUrl =
            gateway === "esewa"
                ? `${baseUrl}/api/payments/esewa/launch/${createEsewaLaunchToken(payment._id)}`
                : null;

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
            launchUrl: esewaLaunchUrl,
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
 * @desc    Serve auto-submit eSewa payment page for browser launch
 * @route   GET /api/payments/esewa/launch/:token
 * @access  Public (token-protected)
 */
export const serveEsewaPaymentLaunchPage = async (req, res) => {
    try {
        const decoded = jwt.verify(req.params.token, process.env.JWT_SECRET);
        const payment = await Payment.findById(decoded.paymentId);

        if (!payment || payment.gateway !== "esewa") {
            return res.status(404).send("Payment not found");
        }

        const invoice = await Invoice.findById(payment.invoiceId).lean();
        if (!invoice) {
            return res.status(404).send("Invoice not found");
        }

        if (invoice.status === "Paid" || payment.status === "completed") {
            return res.redirect(
                buildRedirectUrl("payment-success", {
                    txn: payment.transactionId,
                    amount: payment.amount,
                    invoice: payment.invoiceId,
                    gateway: "esewa",
                })
            );
        }

        if (isEsewaIntentEnabled() && isMobileEsewaBrowser(req.get("user-agent") || "")) {
            try {
                let intentSession = getEsewaIntentState(payment);
                const canReuseIntentSession =
                    intentSession?.deeplink &&
                    intentSession?.booking_id &&
                    intentSession?.correlation_id &&
                    !isTerminalEsewaIntentStatus(intentSession.status);

                if (!canReuseIntentSession) {
                    const baseUrl = getPublicBaseUrl();
                    const bookResult = await bookEsewaIntentPayment({
                        amount: payment.amount,
                        transactionUuid: payment.transactionId,
                        callbackUrl: `${baseUrl}/api/payments/esewa/intent/callback`,
                        redirectUrl: `${baseUrl}${buildRedirectUrl("payment-success", {
                            txn: payment.transactionId,
                            amount: payment.amount,
                            invoice: payment.invoiceId,
                            gateway: "esewa",
                        })}`,
                        failureUrl: `${baseUrl}${buildRedirectUrl("payment-failed", {
                            txn: payment.transactionId,
                            gateway: "esewa",
                            reason: "cancelled",
                        })}`,
                        properties: {
                            customer_id: payment.userId.toString(),
                            remarks: `Rent payment ${invoice.invoiceNumber || invoice._id}`,
                        },
                    });

                    intentSession = buildEsewaIntentGatewayResponse(payment, {
                        ...(bookResult?.data || {}),
                        status: "BOOKED",
                    });
                    payment.status = "pending";
                    payment.failureReason = undefined;
                    payment.gatewayResponse = intentSession;
                    await payment.save();
                }

                return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Opening eSewa</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #ecfccb 0%, #dcfce7 100%);
      font-family: Arial, Helvetica, sans-serif;
      color: #14532d;
    }
    .card {
      background: white;
      border-radius: 18px;
      box-shadow: 0 16px 40px rgba(20, 83, 45, 0.12);
      padding: 32px 28px;
      max-width: 420px;
      text-align: center;
    }
    .spinner {
      width: 42px;
      height: 42px;
      border: 4px solid #dcfce7;
      border-top-color: #16a34a;
      border-radius: 50%;
      margin: 0 auto 18px;
      animation: spin 1s linear infinite;
    }
    .button {
      display: inline-block;
      margin-top: 18px;
      padding: 12px 18px;
      border-radius: 10px;
      background: #16a34a;
      color: white;
      text-decoration: none;
      font-weight: 600;
      cursor: pointer;
      border: 0;
    }
    p {
      line-height: 1.5;
      color: #166534;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h1>Opening eSewa</h1>
    <p>Rentivo is opening the eSewa mobile payment flow. If nothing happens, tap the button below.</p>
    <a class="button" href="${escapeHtmlAttribute(intentSession.deeplink)}">Open eSewa</a>
    <p>After completing the payment, return to Rentivo. We will sync the invoice automatically.</p>
  </div>
  <script>
    setTimeout(function () {
      window.location.href = ${JSON.stringify(intentSession.deeplink)};
    }, 400);
  </script>
</body>
</html>`);
            } catch (intentError) {
                console.error("Failed to initialize eSewa intent flow, falling back to web ePay:", intentError);
            }
        }

        const paymentData = initializeEsewaPayment(
            payment.amount,
            payment.transactionId
        );

        return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Redirecting to eSewa</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      font-family: Arial, Helvetica, sans-serif;
      color: #0f172a;
    }
    .card {
      background: white;
      border-radius: 18px;
      box-shadow: 0 16px 40px rgba(15, 23, 42, 0.12);
      padding: 32px 28px;
      max-width: 420px;
      text-align: center;
    }
    .spinner {
      width: 42px;
      height: 42px;
      border: 4px solid #dbeafe;
      border-top-color: #16a34a;
      border-radius: 50%;
      margin: 0 auto 18px;
      animation: spin 1s linear infinite;
    }
    .button {
      display: inline-block;
      margin-top: 18px;
      padding: 12px 18px;
      border-radius: 10px;
      background: #16a34a;
      color: white;
      text-decoration: none;
      font-weight: 600;
      cursor: pointer;
      border: 0;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h1>Redirecting to eSewa</h1>
    <p>Complete the payment in your browser or the eSewa app. If nothing happens, tap the button below.</p>
    <form id="esewaForm" action="${paymentData.payment_url}" method="POST">
      <input type="hidden" name="amount" value="${escapeHtmlAttribute(paymentData.amount)}" />
      <input type="hidden" name="tax_amount" value="${escapeHtmlAttribute(paymentData.tax_amount)}" />
      <input type="hidden" name="total_amount" value="${escapeHtmlAttribute(paymentData.total_amount)}" />
      <input type="hidden" name="transaction_uuid" value="${escapeHtmlAttribute(paymentData.transaction_uuid)}" />
      <input type="hidden" name="product_code" value="${escapeHtmlAttribute(paymentData.product_code)}" />
      <input type="hidden" name="product_service_charge" value="${escapeHtmlAttribute(paymentData.product_service_charge)}" />
      <input type="hidden" name="product_delivery_charge" value="${escapeHtmlAttribute(paymentData.product_delivery_charge)}" />
      <input type="hidden" name="success_url" value="${escapeHtmlAttribute(paymentData.success_url)}" />
      <input type="hidden" name="failure_url" value="${escapeHtmlAttribute(paymentData.failure_url)}" />
      <input type="hidden" name="signed_field_names" value="${escapeHtmlAttribute(paymentData.signed_field_names)}" />
      <input type="hidden" name="signature" value="${escapeHtmlAttribute(paymentData.signature)}" />
      <button class="button" type="submit">Continue to eSewa</button>
    </form>
  </div>
  <script>
    setTimeout(function () {
      document.getElementById("esewaForm").submit();
    }, 400);
  </script>
</body>
</html>`);
    } catch (error) {
        console.error("Failed to serve eSewa launch page:", error);
        return res.status(400).send("Invalid or expired payment link");
    }
};

/**
 * @desc    Receive eSewa intent callback notifications
 * @route   POST /api/payments/esewa/intent/callback
 * @access  Public (Payment gateway callback)
 */
export const handleEsewaIntentCallback = async (req, res) => {
    try {
        const callbackData =
            req.body && Object.keys(req.body).length > 0 ? req.body : req.query;

        const { correlation_id, signature } = callbackData;
        const status = String(callbackData.status || "").toUpperCase();

        if (!correlation_id || !status || !signature) {
            return res.status(400).json({
                success: false,
                message: "Missing required eSewa intent callback fields",
            });
        }

        const payment = await Payment.findOne({
            "gatewayResponse.correlation_id": correlation_id,
        });

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: "Payment not found for eSewa intent callback",
            });
        }

        const expectedSignature = verifyEsewaIntentSignature(callbackData);
        if (signature !== expectedSignature) {
            payment.status = "failed";
            payment.failureReason = "eSewa intent callback signature verification failed";
            payment.gatewayResponse = buildEsewaIntentGatewayResponse(payment, {
                ...callbackData,
                status,
            });
            await payment.save();

            return res.status(400).json({
                success: false,
                message: "Invalid eSewa intent signature",
            });
        }

        const gatewayResponse = buildEsewaIntentGatewayResponse(payment, {
            ...callbackData,
            status,
        });
        const paidAmount = Number(callbackData.amount ?? payment.amount);

        if (Math.abs(paidAmount - payment.amount) > 0.01) {
            payment.status = "failed";
            payment.failureReason = "Amount mismatch";
            payment.gatewayResponse = gatewayResponse;
            await payment.save();

            return res.status(400).json({
                success: false,
                message: "Amount mismatch",
            });
        }

        if (status === "SUCCESS") {
            await finalizeOnlinePayment({
                payment,
                gatewayResponse,
                paidAmount,
                gatewayLabel: "eSewa",
            });

            return res.status(200).json({
                success: true,
                status,
            });
        }

        if (isTerminalEsewaIntentStatus(status)) {
            await updateEsewaIntentFailure(payment, gatewayResponse, status);

            return res.status(200).json({
                success: true,
                status,
            });
        }

        payment.status = "pending";
        payment.failureReason = undefined;
        payment.gatewayResponse = gatewayResponse;
        await payment.save();

        return res.status(200).json({
            success: true,
            status,
        });
    } catch (error) {
        console.error("eSewa intent callback error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to process eSewa intent callback",
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

        if (
            payment.gateway === "esewa" &&
            ["initiated", "pending"].includes(payment.status)
        ) {
            try {
                if (getEsewaIntentState(payment)) {
                    await reconcileEsewaIntentStatus(payment);
                } else {
                    const esewaStatus = await reconcileEsewaStatus({
                        payment,
                        transactionId: payment.transactionId,
                        totalAmount: payment.amount,
                        productCode: payment.gatewayResponse?.product_code || getEsewaMerchantId(),
                    });

                    if (esewaStatus && payment.status !== "completed") {
                        payment.gatewayResponse = mergeGatewayResponse(payment.gatewayResponse, esewaStatus);

                        if (isRetryableEsewaStatus(esewaStatus.status)) {
                            payment.status = "pending";
                            payment.failureReason = undefined;
                        } else if (esewaStatus.status && esewaStatus.status !== "COMPLETE") {
                            payment.status = "failed";
                            payment.failureReason = `eSewa status: ${esewaStatus.status}`;
                        }

                        await payment.save();
                    }
                }
            } catch (esewaStatusError) {
                console.error("Failed to reconcile eSewa payment status:", esewaStatusError);
            }
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
        const { transaction_uuid, transactionId, PRN, gateway, total_amount, amount, product_code } = req.query;
        const txnId = req.params.transactionId || transaction_uuid || transactionId || PRN;
        const payment = txnId ? await Payment.findOne({ transactionId: txnId }) : null;

        if ((req.params.transactionId || gateway === "esewa" || payment?.gateway === "esewa") && txnId) {
            const resolvedAmount = parseFloat(total_amount || amount || payment?.amount);
            const resolvedProductCode = product_code || getEsewaMerchantId();

            if (!Number.isNaN(resolvedAmount) && resolvedProductCode) {
                try {
                    const esewaStatus = await reconcileEsewaStatus({
                        payment,
                        transactionId: txnId,
                        totalAmount: resolvedAmount,
                        productCode: resolvedProductCode,
                    });

                    if (esewaStatus?.status === "COMPLETE") {
                        return res.redirect(
                            buildRedirectUrl("payment-success", {
                                txn: txnId,
                                amount: esewaStatus.total_amount || resolvedAmount,
                                invoice: payment?.invoiceId,
                                gateway: "esewa",
                            })
                        );
                    }

                    if (payment && payment.status !== "completed") {
                        payment.status = isRetryableEsewaStatus(esewaStatus?.status)
                            ? "pending"
                            : "failed";
                        payment.failureReason = esewaStatus?.status
                            ? `eSewa redirected to failure URL with status ${esewaStatus.status}`
                            : "Payment cancelled or failed by user";
                        payment.gatewayResponse = esewaStatus;
                        await payment.save();
                    }

                    return res.redirect(
                        buildRedirectUrl("payment-failed", {
                            txn: txnId,
                            gateway: "esewa",
                            status: esewaStatus?.status || "FAILED",
                            reason: esewaStatus?.status?.toLowerCase() || "cancelled",
                        })
                    );
                } catch (statusError) {
                    console.error("eSewa status check from failure handler failed:", statusError);
                }
            }
        }

        if (txnId && payment && payment.status !== "completed") {
            payment.status = "failed";
            payment.failureReason = "Payment cancelled or failed by user";
            await payment.save();

            await createNotification(
                payment.userId,
                "payment",
                "Your payment was cancelled or could not be processed. Please try again."
            );
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

        let verifiedEsewaResponse = decodedData;

        if (status !== "COMPLETE") {
            console.log(`eSewa payment not complete. Status: ${status}`);
            const fallbackStatus = await reconcileEsewaStatus({
                payment: null,
                transactionId: transaction_uuid,
                totalAmount: total_amount,
                productCode: product_code || getEsewaMerchantId(),
            });

            if (fallbackStatus?.status !== "COMPLETE") {
                return res.redirect(
                    buildRedirectUrl("payment-failed", {
                        status: fallbackStatus?.status || status,
                        txn: transaction_uuid,
                        gateway: "esewa",
                    })
                );
            }

            verifiedEsewaResponse = fallbackStatus;
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

        if (verifiedEsewaResponse === decodedData) {
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
        }

        // Verify amount
        const settledAmount = parseFloat(verifiedEsewaResponse.total_amount || total_amount);
        if (Math.abs(settledAmount - payment.amount) > 0.01) {
            console.error("Amount mismatch", {
                expected: payment.amount,
                received: settledAmount,
            });

            payment.status = "failed";
            payment.failureReason = "Amount mismatch";
            payment.gatewayResponse = verifiedEsewaResponse;
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
            gatewayResponse: verifiedEsewaResponse,
            paidAmount: settledAmount,
            gatewayLabel: "eSewa",
        });

        console.log(`✓ eSewa payment verified successfully: ${transaction_uuid}`);

        return res.redirect(
            buildRedirectUrl("payment-success", {
                txn: transaction_uuid,
                amount: settledAmount,
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
