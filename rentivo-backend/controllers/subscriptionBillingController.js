import jwt from "jsonwebtoken";
import Subscription from "../models/subscriptionModel.js";
import SubscriptionPayment from "../models/subscriptionPaymentModel.js";
import {
    bookEsewaIntentPayment,
    checkEsewaIntentPaymentStatus,
    checkEsewaTransactionStatus,
    getEsewaIntentProductCode,
    getEsewaMerchantId,
    initializeEsewaPayment,
    verifyEsewaIntentSignature,
    verifyEsewaSignature,
} from "../payment/gateways/esewaGateway.js";
import {
    initializeKhaltiPayment,
    verifyKhaltiPayment as khaltiLookup,
} from "../payment/gateways/khaltiGateway.js";
import { createNotification } from "./notificationController.js";
import {
    SUBSCRIPTION_GATEWAYS,
    applyPaidSubscriptionPlan,
    getOrCreateLandlordSubscription,
    getPaidSubscriptionPlan,
    getSubscriptionPlansForClient,
} from "../utils/subscriptionService.js";

// Billing controller handles checkout initiation, callback verification, and reconciliation.
const ALLOWED_CLIENT_REDIRECT_PROTOCOLS = new Set([
    "frontendmobile:",
    "exp:",
    "exps:",
]);

const DEFAULT_CLIENT_REDIRECT_ROUTES = {
    "subscription-success": "frontendmobile://khalti-subscription-return",
    "subscription-failed": "frontendmobile://khalti-subscription-return",
};

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

const isAllowedClientRedirectUri = (value = "") => {
    try {
        if (typeof value !== "string" || !value) {
            return false;
        }

        const parsed = new URL(value);
        return ALLOWED_CLIENT_REDIRECT_PROTOCOLS.has(parsed.protocol);
    } catch (_error) {
        return false;
    }
};

const buildClientRedirectUrl = (clientRedirectUri, params = {}) => {
    const redirectUrl = new URL(clientRedirectUri);

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            redirectUrl.searchParams.set(key, value.toString());
        }
    });

    return redirectUrl.toString();
};

const getDefaultClientRedirectUri = (webPath) => DEFAULT_CLIENT_REDIRECT_ROUTES[webPath] || null;

const redirectToClientOrWeb = (res, { clientRedirectUri, webPath, params = {} }) => {
    const effectiveClientRedirectUri = isAllowedClientRedirectUri(clientRedirectUri)
        ? clientRedirectUri
        : getDefaultClientRedirectUri(webPath);

    const redirectTarget = effectiveClientRedirectUri
        ? buildClientRedirectUrl(effectiveClientRedirectUri, params)
        : buildRedirectUrl(webPath, params);

    return res.redirect(redirectTarget);
};

const escapeHtmlAttribute = (value) =>
    String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

const getPublicBaseUrl = () =>
    (process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`)
        .trim()
        .replace(/\/+$/, "");

const createEsewaLaunchToken = (paymentId) =>
    jwt.sign({ paymentId }, process.env.JWT_SECRET, { expiresIn: "15m" });

const createSubscriptionTransactionId = (gateway, landlordId) => {
    const compactTimestamp = Date.now().toString(36);
    const landlordSuffix = landlordId.toString().slice(-4).toLowerCase();

    if (gateway === "esewa") {
        return `sub-${compactTimestamp}-${landlordSuffix}`;
    }

    return `SUB-${Date.now()}-${landlordId.toString().slice(-6)}`;
};

const isEsewaIntentEnabled = () =>
    String(process.env.ESEWA_ENABLE_INTENT || "")
        .trim()
        .toLowerCase() === "true";

const isMobileEsewaBrowser = (userAgent = "") =>
    /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent) && !/wv|Flutter/i.test(userAgent);

const isRetryableEsewaStatus = (status) =>
    ["PENDING", "AMBIGUOUS", "NOT_FOUND"].includes(status);

const isTerminalEsewaIntentStatus = (status) =>
    ["SUCCESS", "FAILED", "CANCELED", "REVERTED"].includes(status);

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

const formatDateForMessage = (date) =>
    new Date(date).toLocaleDateString("en-NP", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });

const ensureLandlord = (req, res) => {
    if (req.user?.role !== "landlord") {
        res.status(403).json({
            success: false,
            message: "Only landlords can manage subscriptions.",
        });
        return false;
    }

    return true;
};

const createSubscriptionSuccessParams = (payment, amount, validUntil) => ({
    txn: payment.transactionId,
    amount,
    plan: payment.plan,
    gateway: payment.gateway,
    validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
});

const createSubscriptionFailureParams = (payment, extra = {}) => ({
    txn: payment?.transactionId,
    plan: payment?.plan,
    gateway: payment?.gateway || extra.gateway,
    ...extra,
});

const markSubscriptionPaymentFailed = async ({
    payment,
    gatewayResponse,
    failureReason,
    notify = true,
}) => {
    if (!payment) {
        return null;
    }

    const shouldNotify = notify && payment.status !== "failed";

    payment.status = "failed";
    payment.failureReason = failureReason;
    payment.gatewayResponse = gatewayResponse;
    await payment.save();

    if (shouldNotify) {
        await createNotification(
            payment.landlordId,
            "subscription",
            "Your subscription payment could not be completed. Please try again."
        );
    }

    return payment;
};

const finalizeSuccessfulSubscriptionPayment = async ({
    payment,
    gatewayResponse,
    paidAmount,
    gatewayLabel,
    gatewayReference,
}) => {
    const now = new Date();

    payment.status = "completed";
    payment.gatewayResponse = gatewayResponse;
    payment.gatewayReference = gatewayReference || payment.gatewayReference;
    payment.paidAt = payment.paidAt || now;

    if (payment.appliedAt) {
        await payment.save();
        const existingSubscription = await Subscription.findById(payment.subscriptionId);
        return {
            subscription: existingSubscription,
            periodEnd: payment.periodEnd || existingSubscription?.endDate,
        };
    }

    const subscription =
        (await Subscription.findById(payment.subscriptionId)) ||
        (await getOrCreateLandlordSubscription({ _id: payment.landlordId, role: "landlord" }, now));

    const applied = await applyPaidSubscriptionPlan({
        subscription,
        planKey: payment.plan,
        gateway: payment.gateway,
        paymentReference: gatewayReference || payment.transactionId,
        now,
    });

    payment.appliedAt = now;
    payment.periodStart = applied.periodStart;
    payment.periodEnd = applied.periodEnd;
    await payment.save();

    await createNotification(
        payment.landlordId,
        "subscription",
        `Your ${applied.plan.label} subscription payment of NPR ${paidAmount} via ${gatewayLabel} was successful. Your plan is active until ${formatDateForMessage(applied.subscription.endDate)}.`
    );

    return {
        subscription: applied.subscription,
        periodEnd: applied.periodEnd,
    };
};

const updateEsewaIntentFailure = async (payment, gatewayResponse, status) =>
    markSubscriptionPaymentFailed({
        payment,
        gatewayResponse,
        failureReason: `eSewa intent status: ${status}`,
    });

const reconcileEsewaStatus = async ({
    payment,
    transactionId,
    totalAmount,
    productCode,
}) => {
    const latestStatus = await checkEsewaTransactionStatus({
        transactionUuid: transactionId,
        totalAmount,
        productCode,
    });

    if (latestStatus?.status === "COMPLETE" && payment) {
        await finalizeSuccessfulSubscriptionPayment({
            payment,
            gatewayResponse: latestStatus,
            paidAmount: Number(latestStatus.total_amount || totalAmount),
            gatewayLabel: "eSewa",
            gatewayReference: latestStatus.transaction_code || payment.transactionId,
        });
    }

    return latestStatus;
};

// Returns available gateways and plan details so the client can build the checkout UI
export const getSubscriptionConfig = async (_req, res) => {
    try {
        return res.status(200).json({
            success: true,
            availableGateways: SUBSCRIPTION_GATEWAYS,
            defaultGateway: "esewa",
            plans: getSubscriptionPlansForClient(),
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch subscription configuration",
        });
    }
};

// Creates the payment record and returns gateway-specific data the client needs to redirect the user
export const initiateSubscriptionCheckout = async (req, res) => {
    try {
        if (!ensureLandlord(req, res)) {
            return;
        }

        const { plan, gateway, clientRedirectUri } = req.body;

        if (!SUBSCRIPTION_GATEWAYS.includes(gateway)) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment gateway. Choose: esewa or khalti",
            });
        }

        const planDetails = getPaidSubscriptionPlan(plan);
        if (!planDetails) {
            return res.status(400).json({
                success: false,
                message: "Invalid subscription plan. Choose Monthly or Yearly.",
            });
        }

        const now = new Date();
        const subscription = await getOrCreateLandlordSubscription(req.user, now);
        const transactionId = createSubscriptionTransactionId(gateway, req.user._id);
        const baseUrl = getPublicBaseUrl();
        const customerInfo = {
            name: req.user.name,
            email: req.user.email,
            phone: req.user.phone || "9800000000",
        };

        let gatewayResponse;

        if (gateway === "esewa") {
            gatewayResponse = initializeEsewaPayment(planDetails.amount, transactionId, {
                successUrl: `${baseUrl}/api/subscriptions/esewa/verify`,
                failureUrl: `${baseUrl}/api/subscriptions/esewa/failure/${encodeURIComponent(transactionId)}`,
            });
        } else {
            const khaltiReturnUrl = new URL(`${baseUrl}/api/subscriptions/khalti/verify`);
            if (isAllowedClientRedirectUri(clientRedirectUri)) {
                khaltiReturnUrl.searchParams.set("clientRedirectUri", clientRedirectUri);
            }

            gatewayResponse = await initializeKhaltiPayment(
                planDetails.amount,
                transactionId,
                subscription._id,
                customerInfo,
                {
                    returnUrl: khaltiReturnUrl.toString(),
                    websiteUrl: baseUrl,
                    purchaseOrderName: `Rentivo ${planDetails.label} Plan`,
                }
            );
        }

        const payment = await SubscriptionPayment.create({
            landlordId: req.user._id,
            subscriptionId: subscription._id,
            plan: planDetails.plan,
            billingCycle: planDetails.billingCycle,
            amount: planDetails.amount,
            gateway,
            transactionId,
            status: "initiated",
            gatewayResponse,
        });

        const esewaLaunchUrl =
            gateway === "esewa"
                ? `${baseUrl}/api/subscriptions/esewa/launch/${createEsewaLaunchToken(payment._id)}`
                : null;

        return res.status(200).json({
            success: true,
            message: "Subscription checkout initiated successfully",
            payment: {
                paymentId: payment._id,
                transactionId,
                amount: planDetails.amount,
                plan: planDetails.plan,
                billingCycle: planDetails.billingCycle,
                gateway,
            },
            gatewayData: gatewayResponse,
            launchUrl: esewaLaunchUrl,
        });
    } catch (error) {
        console.error("Subscription checkout initiation error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to initiate subscription checkout",
        });
    }
};

export const getSubscriptionPaymentHistory = async (req, res) => {
    try {
        if (!ensureLandlord(req, res)) {
            return;
        }

        const payments = await SubscriptionPayment.find({ landlordId: req.user._id })
            .sort({ createdAt: -1 })
            .limit(20);

        return res.status(200).json({
            success: true,
            count: payments.length,
            payments,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch subscription payments",
        });
    }
};

export const getSubscriptionPaymentById = async (req, res) => {
    try {
        if (!ensureLandlord(req, res)) {
            return;
        }

        const payment = await SubscriptionPayment.findById(req.params.id);

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: "Subscription payment not found",
            });
        }

        if (payment.landlordId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to view this subscription payment",
            });
        }

        return res.status(200).json({
            success: true,
            payment,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch subscription payment",
        });
    }
};

// Serves an intermediary HTML page that auto-submits the eSewa form or opens the intent deeplink on mobile
export const serveSubscriptionEsewaLaunchPage = async (req, res) => {
    try {
        const decoded = jwt.verify(req.params.token, process.env.JWT_SECRET);
        const payment = await SubscriptionPayment.findById(decoded.paymentId);

        if (!payment || payment.gateway !== "esewa") {
            return res.status(404).send("Subscription payment not found");
        }

        if (payment.status === "completed") {
            return res.redirect(
                buildRedirectUrl(
                    "subscription-success",
                    createSubscriptionSuccessParams(payment, payment.amount, payment.periodEnd)
                )
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
                        callbackUrl: `${baseUrl}/api/subscriptions/esewa/intent/callback`,
                        redirectUrl: `${baseUrl}${buildRedirectUrl(
                            "subscription-success",
                            createSubscriptionSuccessParams(payment, payment.amount)
                        )}`,
                        failureUrl: `${baseUrl}${buildRedirectUrl(
                            "subscription-failed",
                            createSubscriptionFailureParams(payment, {
                                reason: "cancelled",
                            })
                        )}`,
                        properties: {
                            customer_id: payment.landlordId.toString(),
                            remarks: `Rentivo ${payment.plan} subscription`,
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
    body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #ecfccb 0%, #dcfce7 100%); font-family: Arial, Helvetica, sans-serif; color: #14532d; }
    .card { background: white; border-radius: 18px; box-shadow: 0 16px 40px rgba(20, 83, 45, 0.12); padding: 32px 28px; max-width: 420px; text-align: center; }
    .spinner { width: 42px; height: 42px; border: 4px solid #dcfce7; border-top-color: #16a34a; border-radius: 50%; margin: 0 auto 18px; animation: spin 1s linear infinite; }
    .button { display: inline-block; margin-top: 18px; padding: 12px 18px; border-radius: 10px; background: #16a34a; color: white; text-decoration: none; font-weight: 600; cursor: pointer; border: 0; }
    p { line-height: 1.5; color: #166534; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h1>Opening eSewa</h1>
    <p>Rentivo is opening your eSewa subscription payment. If nothing happens, tap the button below.</p>
    <a class="button" href="${escapeHtmlAttribute(intentSession.deeplink)}">Open eSewa</a>
    <p>Return to Rentivo after payment and we will activate your subscription automatically.</p>
  </div>
  <script>
    setTimeout(function () {
      window.location.href = ${JSON.stringify(intentSession.deeplink)};
    }, 400);
  </script>
</body>
</html>`);
            } catch (intentError) {
                console.error(
                    "Failed to initialize subscription eSewa intent flow, falling back to web ePay:",
                    intentError
                );
            }
        }

        const paymentData = initializeEsewaPayment(payment.amount, payment.transactionId, {
            successUrl: `${getPublicBaseUrl()}/api/subscriptions/esewa/verify`,
            failureUrl: `${getPublicBaseUrl()}/api/subscriptions/esewa/failure/${encodeURIComponent(payment.transactionId)}`,
        });

        return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Redirecting to eSewa</title>
  <style>
    body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); font-family: Arial, Helvetica, sans-serif; color: #0f172a; }
    .card { background: white; border-radius: 18px; box-shadow: 0 16px 40px rgba(15, 23, 42, 0.12); padding: 32px 28px; max-width: 420px; text-align: center; }
    .spinner { width: 42px; height: 42px; border: 4px solid #dbeafe; border-top-color: #16a34a; border-radius: 50%; margin: 0 auto 18px; animation: spin 1s linear infinite; }
    .button { display: inline-block; margin-top: 18px; padding: 12px 18px; border-radius: 10px; background: #16a34a; color: white; text-decoration: none; font-weight: 600; cursor: pointer; border: 0; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h1>Redirecting to eSewa</h1>
    <p>Complete the subscription payment in eSewa. If nothing happens, tap the button below.</p>
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
        console.error("Failed to serve subscription eSewa launch page:", error);
        return res.status(400).send("Invalid or expired subscription payment link");
    }
};

// eSewa calls this server-side when an intent payment status changes, so we don't rely on the user returning
export const handleSubscriptionEsewaIntentCallback = async (req, res) => {
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

        const payment = await SubscriptionPayment.findOne({
            "gatewayResponse.correlation_id": correlation_id,
        });

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: "Subscription payment not found for eSewa intent callback",
            });
        }

        const expectedSignature = verifyEsewaIntentSignature(callbackData);
        if (signature !== expectedSignature) {
            await markSubscriptionPaymentFailed({
                payment,
                gatewayResponse: buildEsewaIntentGatewayResponse(payment, {
                    ...callbackData,
                    status,
                }),
                failureReason: "eSewa intent callback signature verification failed",
            });

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
            await markSubscriptionPaymentFailed({
                payment,
                gatewayResponse,
                failureReason: "Amount mismatch",
            });

            return res.status(400).json({
                success: false,
                message: "Amount mismatch",
            });
        }

        if (status === "SUCCESS") {
            await finalizeSuccessfulSubscriptionPayment({
                payment,
                gatewayResponse,
                paidAmount,
                gatewayLabel: "eSewa",
                gatewayReference:
                    gatewayResponse.reference_code || payment.transactionId,
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
        console.error("Subscription eSewa intent callback error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to process eSewa intent callback",
        });
    }
};

// eSewa sometimes redirects here even on success, so we reconcile the real status before marking as failed
export const handleSubscriptionPaymentFailure = async (req, res) => {
    try {
        const {
            transaction_uuid,
            transactionId,
            PRN,
            gateway,
            total_amount,
            amount,
            product_code,
        } = req.query;
        const txnId = req.params.transactionId || transaction_uuid || transactionId || PRN;
        const payment = txnId
            ? await SubscriptionPayment.findOne({ transactionId: txnId })
            : null;

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

                    if (esewaStatus?.status === "COMPLETE" && payment) {
                        return res.redirect(
                            buildRedirectUrl(
                                "subscription-success",
                                createSubscriptionSuccessParams(
                                    payment,
                                    esewaStatus.total_amount || resolvedAmount,
                                    payment.periodEnd
                                )
                            )
                        );
                    }

                    if (payment && payment.status !== "completed") {
                        payment.status = isRetryableEsewaStatus(esewaStatus?.status)
                            ? "pending"
                            : "failed";
                        payment.failureReason = esewaStatus?.status
                            ? `eSewa redirected to failure URL with status ${esewaStatus.status}`
                            : "Subscription payment cancelled or failed by user";
                        payment.gatewayResponse = esewaStatus;
                        await payment.save();
                    }

                    return res.redirect(
                        buildRedirectUrl(
                            "subscription-failed",
                            createSubscriptionFailureParams(payment, {
                                status: esewaStatus?.status || "FAILED",
                                reason: esewaStatus?.status?.toLowerCase() || "cancelled",
                                gateway: "esewa",
                            })
                        )
                    );
                } catch (statusError) {
                    console.error(
                        "Subscription eSewa status check from failure handler failed:",
                        statusError
                    );
                }
            }
        }

        if (txnId && payment && payment.status !== "completed") {
            payment.status = "failed";
            payment.failureReason = "Subscription payment cancelled or failed by user";
            await payment.save();

            await createNotification(
                payment.landlordId,
                "subscription",
                "Your subscription payment was cancelled or could not be processed. Please try again."
            );
        }

        return res.redirect(
            buildRedirectUrl(
                "subscription-failed",
                createSubscriptionFailureParams(payment, { reason: "cancelled", gateway })
            )
        );
    } catch (error) {
        console.error("Subscription payment failure handler error:", error);
        return res.redirect(
            buildRedirectUrl("subscription-failed", {
                reason: "server_error",
            })
        );
    }
};

// Validates eSewa's base64-encoded callback, checks signature and amount, then activates the plan
export const verifySubscriptionEsewaPayment = async (req, res) => {
    try {
        const { data } = req.query;

        if (!data) {
            return res.redirect(
                buildRedirectUrl("subscription-failed", {
                    reason: "no_data",
                    gateway: "esewa",
                })
            );
        }

        let decodedData;
        try {
            decodedData = JSON.parse(Buffer.from(data, "base64").toString("utf-8"));
        } catch (error) {
            console.error("Subscription eSewa verification failed: invalid base64", error);
            return res.redirect(
                buildRedirectUrl("subscription-failed", {
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
            signature,
        } = decodedData;

        let verifiedEsewaResponse = decodedData;

        if (status !== "COMPLETE") {
            const fallbackStatus = await reconcileEsewaStatus({
                payment: null,
                transactionId: transaction_uuid,
                totalAmount: total_amount,
                productCode: product_code || getEsewaMerchantId(),
            });

            if (fallbackStatus?.status !== "COMPLETE") {
                return res.redirect(
                    buildRedirectUrl("subscription-failed", {
                        status: fallbackStatus?.status || status,
                        txn: transaction_uuid,
                        gateway: "esewa",
                    })
                );
            }

            verifiedEsewaResponse = fallbackStatus;
        }

        const payment = await SubscriptionPayment.findOne({
            transactionId: transaction_uuid,
        });

        if (!payment) {
            return res.redirect(
                buildRedirectUrl("subscription-failed", {
                    reason: "not_found",
                    txn: transaction_uuid,
                    gateway: "esewa",
                })
            );
        }

        if (verifiedEsewaResponse === decodedData) {
            try {
                const expectedSignature = verifyEsewaSignature(decodedData);

                if (signature !== expectedSignature) {
                    await markSubscriptionPaymentFailed({
                        payment,
                        gatewayResponse: decodedData,
                        failureReason: "Signature verification failed",
                    });

                    return res.redirect(
                        buildRedirectUrl(
                            "subscription-failed",
                            createSubscriptionFailureParams(payment, {
                                reason: "signature_mismatch",
                                gateway: "esewa",
                            })
                        )
                    );
                }
            } catch (error) {
                await markSubscriptionPaymentFailed({
                    payment,
                    gatewayResponse: decodedData,
                    failureReason: "Signature verification error",
                    notify: false,
                });

                return res.redirect(
                    buildRedirectUrl(
                        "subscription-failed",
                        createSubscriptionFailureParams(payment, {
                            reason: "verification_error",
                            gateway: "esewa",
                        })
                    )
                );
            }
        }

        const settledAmount = parseFloat(
            verifiedEsewaResponse.total_amount || total_amount
        );

        if (Math.abs(settledAmount - payment.amount) > 0.01) {
            await markSubscriptionPaymentFailed({
                payment,
                gatewayResponse: verifiedEsewaResponse,
                failureReason: "Amount mismatch",
                notify: false,
            });

            return res.redirect(
                buildRedirectUrl(
                    "subscription-failed",
                    createSubscriptionFailureParams(payment, {
                        reason: "amount_mismatch",
                        gateway: "esewa",
                    })
                )
            );
        }

        const finalized = await finalizeSuccessfulSubscriptionPayment({
            payment,
            gatewayResponse: verifiedEsewaResponse,
            paidAmount: settledAmount,
            gatewayLabel: "eSewa",
            gatewayReference: transaction_code || payment.transactionId,
        });

        return res.redirect(
            buildRedirectUrl(
                "subscription-success",
                createSubscriptionSuccessParams(
                    payment,
                    settledAmount,
                    finalized.periodEnd || finalized.subscription?.endDate
                )
            )
        );
    } catch (error) {
        console.error("Subscription eSewa verification error:", error);
        return res.redirect(
            buildRedirectUrl("subscription-failed", {
                reason: "server_error",
                gateway: "esewa",
            })
        );
    }
};

// Khalti calls back with a pidx, we look it up server-side to confirm the actual status
export const verifySubscriptionKhaltiPayment = async (req, res) => {
    try {
        const callbackPayload =
            req.method === "GET" || req.method === "HEAD" ? req.query : req.body || {};
        const {
            pidx,
            purchase_order_id,
            transaction_id,
            txnId,
            clientRedirectUri,
        } = callbackPayload;

        if (!pidx) {
            return redirectToClientOrWeb(res, {
                clientRedirectUri,
                webPath: "subscription-failed",
                params: {
                    reason: "no_pidx",
                    gateway: "khalti",
                },
            });
        }

        let lookupResult;
        try {
            lookupResult = await khaltiLookup(pidx);
        } catch (error) {
            console.error("Subscription Khalti lookup failed:", error.message);
            return redirectToClientOrWeb(res, {
                clientRedirectUri,
                webPath: "subscription-failed",
                params: {
                    reason: "lookup_failed",
                    gateway: "khalti",
                },
            });
        }

        const transactionId =
            purchase_order_id ||
            lookupResult.purchase_order_id ||
            transaction_id ||
            txnId;

        if (!transactionId) {
            return redirectToClientOrWeb(res, {
                clientRedirectUri,
                webPath: "subscription-failed",
                params: {
                    reason: "no_txn_id",
                    gateway: "khalti",
                },
            });
        }

        const payment = await SubscriptionPayment.findOne({ transactionId });

        if (!payment) {
            return redirectToClientOrWeb(res, {
                clientRedirectUri,
                webPath: "subscription-failed",
                params: {
                    reason: "not_found",
                    txn: transactionId,
                    gateway: "khalti",
                },
            });
        }

        if (payment.status === "completed" && payment.appliedAt) {
            return redirectToClientOrWeb(res, {
                clientRedirectUri,
                webPath: "subscription-success",
                params: {
                    result: "success",
                    paymentId: payment._id,
                    ...createSubscriptionSuccessParams(
                        payment,
                        payment.amount,
                        payment.periodEnd
                    ),
                },
            });
        }

        if (lookupResult.status !== "Completed") {
            payment.status = lookupResult.status === "Pending" ? "pending" : "failed";
            payment.failureReason = `Khalti status: ${lookupResult.status}`;
            payment.gatewayResponse = lookupResult;
            payment.gatewayReference = lookupResult.pidx || payment.gatewayReference;
            await payment.save();

            if (payment.status === "failed") {
                await createNotification(
                    payment.landlordId,
                    "subscription",
                    "Your Khalti subscription payment could not be completed. Please try again."
                );
            }

            return redirectToClientOrWeb(res, {
                clientRedirectUri,
                webPath: "subscription-failed",
                params: {
                    result: "failed",
                    paymentId: payment._id,
                    ...createSubscriptionFailureParams(payment, {
                        status: lookupResult.status,
                        gateway: "khalti",
                    }),
                },
            });
        }

        const paidAmount = lookupResult.total_amount / 100;
        if (Math.abs(paidAmount - payment.amount) > 0.01) {
            await markSubscriptionPaymentFailed({
                payment,
                gatewayResponse: lookupResult,
                failureReason: "Amount mismatch",
                notify: false,
            });

            return redirectToClientOrWeb(res, {
                clientRedirectUri,
                webPath: "subscription-failed",
                params: {
                    result: "failed",
                    paymentId: payment._id,
                    ...createSubscriptionFailureParams(payment, {
                        reason: "amount_mismatch",
                        gateway: "khalti",
                    }),
                },
            });
        }

        const finalized = await finalizeSuccessfulSubscriptionPayment({
            payment,
            gatewayResponse: lookupResult,
            paidAmount,
            gatewayLabel: "Khalti",
            gatewayReference: lookupResult.pidx || payment.transactionId,
        });

        return redirectToClientOrWeb(res, {
            clientRedirectUri,
            webPath: "subscription-success",
            params: {
                result: "success",
                paymentId: payment._id,
                ...createSubscriptionSuccessParams(
                    payment,
                    paidAmount,
                    finalized.periodEnd || finalized.subscription?.endDate
                ),
            },
        });
    } catch (error) {
        console.error("Subscription Khalti verification error:", error);
        return redirectToClientOrWeb(res, {
            clientRedirectUri: req.method === "GET" ? req.query?.clientRedirectUri : req.body?.clientRedirectUri,
            webPath: "subscription-failed",
            params: {
                reason: "server_error",
                gateway: "khalti",
            },
        });
    }
};

// Used to poll an ongoing eSewa intent session and settle the payment if it completed out-of-band
export const reconcileSubscriptionEsewaIntentStatus = async (payment) => {
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
        await finalizeSuccessfulSubscriptionPayment({
            payment,
            gatewayResponse,
            paidAmount: gatewayResponse.amount,
            gatewayLabel: "eSewa",
            gatewayReference:
                gatewayResponse.reference_code || payment.transactionId,
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
