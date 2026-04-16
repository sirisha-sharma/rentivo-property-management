import CryptoJS from "crypto-js";

const cleanEnv = (value) => (typeof value === "string" ? value.trim() : value);

const cleanBaseUrl = (value) => {
    const normalized = cleanEnv(value);
    return normalized ? normalized.replace(/\/+$/, "") : normalized;
};

const getDefaultEsewaStatusCheckUrl = (paymentUrl) => {
    const normalizedPaymentUrl = cleanEnv(paymentUrl) || "";
    return normalizedPaymentUrl.includes("rc-epay")
        ? "https://uat.esewa.com.np/api/epay/transaction/status/"
        : "https://epay.esewa.com.np/api/epay/transaction/status/";
};

const getFallbackEsewaStatusCheckUrls = (primaryUrl) => {
    const urls = [cleanEnv(primaryUrl)].filter(Boolean);

    if (primaryUrl?.includes("uat.esewa.com.np")) {
        urls.push("https://rc.esewa.com.np/api/epay/transaction/status/");
    } else if (primaryUrl?.includes("rc.esewa.com.np")) {
        urls.push("https://uat.esewa.com.np/api/epay/transaction/status/");
    }

    return [...new Set(urls)];
};

const buildSignedEsewaMessage = (payload, signedFieldNames) =>
    signedFieldNames
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean)
        .map((fieldName) => `${fieldName}=${payload[fieldName] ?? ""}`)
        .join(",");

const signEsewaMessage = (message, secretKey) => {
    const signature = CryptoJS.HmacSHA256(message, secretKey);
    return CryptoJS.enc.Base64.stringify(signature);
};

const postJson = async (url, payload) => {
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    const rawBody = await response.text();

    if (!response.ok) {
        throw new Error(`eSewa request returned ${response.status}: ${rawBody}`);
    }

    return JSON.parse(rawBody);
};

/**
 * Get eSewa configuration (lazy-loaded to ensure env vars are available)
 */
const getEsewaConfig = () => {
    const baseUrl =
        cleanBaseUrl(process.env.BACKEND_URL) ||
        `http://localhost:${process.env.PORT || 3000}`;

    const config = {
        merchantId: cleanEnv(process.env.ESEWA_MERCHANT_ID),
        secretKey: cleanEnv(process.env.ESEWA_SECRET_KEY),
        paymentUrl: cleanEnv(process.env.ESEWA_PAYMENT_URL),
        statusCheckUrl:
            cleanEnv(process.env.ESEWA_STATUS_CHECK_URL) ||
            getDefaultEsewaStatusCheckUrl(process.env.ESEWA_PAYMENT_URL),
        returnUrl: `${baseUrl}/api/payments/esewa/verify`,
        failureUrlBase: `${baseUrl}/api/payments/esewa/failure`,
    };

    if (!config.secretKey) {
        throw new Error("eSewa secret key is not configured. Check ESEWA_SECRET_KEY in .env file");
    }

    if (!config.merchantId) {
        throw new Error("eSewa merchant ID is not configured. Check ESEWA_MERCHANT_ID in .env file");
    }

    return config;
};

const getEsewaIntentConfig = () => {
    const config = {
        productCode: cleanEnv(process.env.ESEWA_INTENT_PRODUCT_CODE) || "INTENT",
        accessKey:
            cleanEnv(process.env.ESEWA_INTENT_ACCESS_KEY) ||
            "LB0REg8HUSw3MTYrI1s6JTE8Kyc6JyAqJiA3MQ==",
        bookUrl:
            cleanEnv(process.env.ESEWA_INTENT_BOOK_URL) ||
            "https://rc-checkout.esewa.com.np/api/client/intent/payment/book",
        statusUrl:
            cleanEnv(process.env.ESEWA_INTENT_STATUS_URL) ||
            "https://rc-checkout.esewa.com.np/api/client/intent/payment/status",
    };

    if (!config.accessKey) {
        throw new Error("eSewa intent access key is not configured.");
    }

    return config;
};

/**
 * Generate eSewa payment signature using HMAC-SHA256
 * @param {Number} totalAmount - Total payment amount
 * @param {String} transactionUuid - Unique transaction ID
 * @param {String} productCode - Optional product code override
 * @returns {String} Base64 encoded signature
 */
export const generateEsewaSignature = (
    totalAmount,
    transactionUuid,
    productCode = null
) => {
    const config = getEsewaConfig();
    const resolvedProductCode = productCode || config.merchantId;
    const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${resolvedProductCode}`;

    try {
        return signEsewaMessage(message, config.secretKey);
    } catch (error) {
        console.error("eSewa signature generation error:", error);
        throw new Error("Failed to generate eSewa signature");
    }
};

/**
 * Initialize eSewa payment
 * @param {Number} amount - Payment amount
 * @param {String} transactionId - Transaction ID
 * @param {Object} options - Optional callback URL overrides
 * @returns {Object} Payment initialization data
 */
export const initializeEsewaPayment = (amount, transactionId, options = {}) => {
    const config = getEsewaConfig();
    const productCode = options.productCode || config.merchantId;
    const signature = generateEsewaSignature(amount, transactionId, productCode);
    const failureUrl =
        options.failureUrl ||
        `${config.failureUrlBase}/${encodeURIComponent(transactionId)}`;
    const successUrl = options.successUrl || config.returnUrl;

    return {
        amount: amount.toString(),
        tax_amount: "0",
        total_amount: amount.toString(),
        transaction_uuid: transactionId,
        product_code: productCode,
        product_service_charge: "0",
        product_delivery_charge: "0",
        success_url: successUrl,
        failure_url: failureUrl,
        signed_field_names: "total_amount,transaction_uuid,product_code",
        signature: signature,
        payment_url: config.paymentUrl,
    };
};

/**
 * Verify eSewa payment signature.
 *
 * eSewa signs the callback by concatenating each field listed in
 * `signed_field_names` in the exact order given, joined by commas, using the
 * actual values from the response (NOT hardcoded values). This implementation
 * dynamically builds the message from `signed_field_names` so the signature
 * matches no matter what fields eSewa decides to sign.
 *
 * @param {Object} decodedData - Decoded JSON from the `data` query parameter
 * @returns {String} Base64 encoded expected signature
 */
export const verifyEsewaSignature = (decodedData) => {
    const config = getEsewaConfig();
    const signedFieldNames = decodedData.signed_field_names || "";
    const message = buildSignedEsewaMessage(decodedData, signedFieldNames);
    return signEsewaMessage(message, config.secretKey);
};

export const getEsewaMerchantId = () => getEsewaConfig().merchantId;

export const getEsewaIntentProductCode = () => getEsewaIntentConfig().productCode;

export const bookEsewaIntentPayment = async ({
    amount,
    transactionUuid,
    callbackUrl,
    redirectUrl,
    failureUrl,
    properties = {},
}) => {
    const config = getEsewaIntentConfig();
    const signedFieldNames = "product_code,amount,transaction_uuid";
    const payload = {
        product_code: config.productCode,
        amount: Number(amount),
        transaction_uuid: transactionUuid,
        signed_field_names: signedFieldNames,
        callback_url: callbackUrl,
        redirect_url: redirectUrl,
        failure_url: failureUrl,
        properties,
    };

    payload.signature = signEsewaMessage(
        buildSignedEsewaMessage(payload, signedFieldNames),
        config.accessKey
    );

    return postJson(config.bookUrl, payload);
};

export const verifyEsewaIntentSignature = (payload) => {
    const config = getEsewaIntentConfig();
    const signedFieldNames = payload.signed_field_names || "";
    const message = buildSignedEsewaMessage(payload, signedFieldNames);
    return signEsewaMessage(message, config.accessKey);
};

export const checkEsewaIntentPaymentStatus = async ({
    bookingId,
    correlationId,
    productCode,
}) => {
    const config = getEsewaIntentConfig();
    const signedFieldNames = "booking_id,product_code,correlation_id";
    const payload = {
        booking_id: bookingId,
        product_code: productCode || config.productCode,
        correlation_id: correlationId,
        signed_field_names: signedFieldNames,
    };

    payload.signature = signEsewaMessage(
        buildSignedEsewaMessage(payload, signedFieldNames),
        config.accessKey
    );

    return postJson(config.statusUrl, payload);
};

export const checkEsewaTransactionStatus = async ({
    productCode,
    totalAmount,
    transactionUuid,
}) => {
    const config = getEsewaConfig();
    const resolvedAmount =
        typeof totalAmount === "number" ? totalAmount.toString() : String(totalAmount);
    const candidateUrls = getFallbackEsewaStatusCheckUrls(config.statusCheckUrl);
    let lastError = null;

    for (const statusCheckUrl of candidateUrls) {
        try {
            const url = new URL(statusCheckUrl);
            url.searchParams.set("product_code", productCode || config.merchantId);
            url.searchParams.set("total_amount", resolvedAmount);
            url.searchParams.set("transaction_uuid", transactionUuid);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            try {
                const response = await fetch(url, { signal: controller.signal });
                const rawBody = await response.text();

                if (!response.ok) {
                    throw new Error(
                        `eSewa status check returned ${response.status}: ${rawBody}`
                    );
                }

                return JSON.parse(rawBody);
            } finally {
                clearTimeout(timeoutId);
            }
        } catch (error) {
            lastError = error;
            console.error(
                `eSewa status check failed via ${statusCheckUrl}:`,
                error.message
            );
        }
    }

    throw lastError || new Error("Failed to verify eSewa transaction status");
};
