import CryptoJS from "crypto-js";

/**
 * Get eSewa configuration (lazy-loaded to ensure env vars are available)
 */
const getEsewaConfig = () => {
    const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;
    const config = {
        merchantId: process.env.ESEWA_MERCHANT_ID,
        secretKey: process.env.ESEWA_SECRET_KEY,
        paymentUrl: process.env.ESEWA_PAYMENT_URL,
        returnUrl: `${baseUrl}/api/payments/esewa/verify`,
        failureUrl: `${baseUrl}/api/payments/failure`,
    };

    if (!config.secretKey) {
        throw new Error("eSewa secret key is not configured. Check ESEWA_SECRET_KEY in .env file");
    }

    if (!config.merchantId) {
        throw new Error("eSewa merchant ID is not configured. Check ESEWA_MERCHANT_ID in .env file");
    }

    return config;
};

/**
 * Generate eSewa payment signature using HMAC-SHA256
 * @param {Number} totalAmount - Total payment amount
 * @param {String} transactionUuid - Unique transaction ID
 * @returns {String} Base64 encoded signature
 */
export const generateEsewaSignature = (totalAmount, transactionUuid) => {
    const config = getEsewaConfig();
    const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${config.merchantId}`;

    try {
        const hash = CryptoJS.HmacSHA256(message, config.secretKey);
        const signature = CryptoJS.enc.Base64.stringify(hash);
        return signature;
    } catch (error) {
        console.error("eSewa signature generation error:", error);
        throw new Error("Failed to generate eSewa signature");
    }
};

/**
 * Initialize eSewa payment
 * @param {Number} amount - Payment amount
 * @param {String} transactionId - Transaction ID
 * @param {String} invoiceId - Invoice ID
 * @returns {Object} Payment initialization data
 */
export const initializeEsewaPayment = (amount, transactionId, invoiceId) => {
    const config = getEsewaConfig();
    const signature = generateEsewaSignature(amount, transactionId);

    return {
        amount: amount.toString(),
        tax_amount: "0",
        total_amount: amount.toString(),
        transaction_uuid: transactionId,
        product_code: config.merchantId,
        product_service_charge: "0",
        product_delivery_charge: "0",
        success_url: config.returnUrl,
        failure_url: config.failureUrl,
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

    // Build the message using each signed field's actual value from the response.
    const fields = signedFieldNames
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean);

    const message = fields
        .map((fieldName) => `${fieldName}=${decodedData[fieldName] ?? ""}`)
        .join(",");

    const signature = CryptoJS.HmacSHA256(message, config.secretKey);
    return CryptoJS.enc.Base64.stringify(signature);
};
