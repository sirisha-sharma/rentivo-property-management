import CryptoJS from "crypto-js";

const ESEWA_CONFIG = {
    merchantId: process.env.ESEWA_MERCHANT_ID,
    secretKey: process.env.ESEWA_SECRET_KEY,
    paymentUrl: process.env.ESEWA_PAYMENT_URL,
    returnUrl: process.env.ESEWA_RETURN_URL,
    failureUrl: process.env.ESEWA_FAILURE_URL,
};

/**
 * Generate eSewa payment signature using HMAC-SHA256
 * @param {Number} totalAmount - Total payment amount
 * @param {String} transactionUuid - Unique transaction ID
 * @returns {String} Base64 encoded signature
 */
export const generateEsewaSignature = (totalAmount, transactionUuid) => {
    const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${ESEWA_CONFIG.merchantId}`;
    const signature = CryptoJS.HmacSHA256(message, ESEWA_CONFIG.secretKey);
    return CryptoJS.enc.Base64.stringify(signature);
};

/**
 * Initialize eSewa payment
 * @param {Number} amount - Payment amount
 * @param {String} transactionId - Transaction ID
 * @param {String} invoiceId - Invoice ID
 * @returns {Object} Payment initialization data
 */
export const initializeEsewaPayment = (amount, transactionId, invoiceId) => {
    const signature = generateEsewaSignature(amount, transactionId);

    return {
        amount: amount.toString(),
        tax_amount: "0",
        total_amount: amount.toString(),
        transaction_uuid: transactionId,
        product_code: ESEWA_CONFIG.merchantId,
        product_service_charge: "0",
        product_delivery_charge: "0",
        success_url: ESEWA_CONFIG.returnUrl,
        failure_url: ESEWA_CONFIG.failureUrl,
        signed_field_names: "total_amount,transaction_uuid,product_code",
        signature: signature,
        payment_url: ESEWA_CONFIG.paymentUrl,
    };
};

/**
 * Verify eSewa payment signature
 * @param {String} transactionCode - Transaction code from eSewa
 * @param {Number} totalAmount - Total amount
 * @param {String} transactionUuid - Transaction UUID
 * @returns {String} Verification signature
 */
export const verifyEsewaSignature = (transactionCode, totalAmount, transactionUuid) => {
    const message = `transaction_code=${transactionCode},status=COMPLETE,total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${ESEWA_CONFIG.merchantId},signed_field_names=transaction_code,status,total_amount,transaction_uuid,product_code`;
    const signature = CryptoJS.HmacSHA256(message, ESEWA_CONFIG.secretKey);
    return CryptoJS.enc.Base64.stringify(signature);
};
