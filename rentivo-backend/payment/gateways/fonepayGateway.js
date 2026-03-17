import CryptoJS from "crypto-js";

/**
 * Get Fonepay configuration (lazy-loaded to ensure env vars are available)
 */
const getFonepayConfig = () => {
    const config = {
        merchantId: process.env.FONEPAY_MERCHANT_ID,
        secretKey: process.env.FONEPAY_SECRET_KEY,
        pid: process.env.FONEPAY_PID,
        paymentUrl: process.env.FONEPAY_PAYMENT_URL,
        verifyUrl: process.env.FONEPAY_VERIFY_URL,
        returnUrl: process.env.FONEPAY_RETURN_URL,
    };

    if (!config.secretKey) {
        throw new Error("Fonepay secret key is not configured. Check FONEPAY_SECRET_KEY in .env file");
    }

    if (!config.merchantId) {
        throw new Error("Fonepay merchant ID is not configured. Check FONEPAY_MERCHANT_ID in .env file");
    }

    if (!config.pid) {
        throw new Error("Fonepay PID is not configured. Check FONEPAY_PID in .env file");
    }

    return config;
};

/**
 * Generate Fonepay checksum using SHA512
 * @param {String} pid - Product ID
 * @param {String} merchantId - Merchant ID
 * @param {Number} amount - Payment amount
 * @param {String} transactionId - Transaction ID (PRN)
 * @param {String} returnUrl - Return URL
 * @returns {String} SHA512 checksum
 */
export const generateFonepayChecksum = (pid, merchantId, amount, transactionId, returnUrl) => {
    const config = getFonepayConfig();

    // Fonepay checksum format: PID,MD,AMT,CRN,DV,RU,DT,R1,R2,SECRET
    // For now, we'll use a simplified version without date and additional fields
    const message = `${pid},${merchantId},${amount},${transactionId},${returnUrl},${config.secretKey}`;

    try {
        const checksum = CryptoJS.SHA512(message).toString(CryptoJS.enc.Hex);
        return checksum;
    } catch (error) {
        console.error("Fonepay checksum generation error:", error);
        throw new Error("Failed to generate Fonepay checksum");
    }
};

/**
 * Initialize Fonepay payment
 * @param {Number} amount - Payment amount
 * @param {String} transactionId - Transaction ID (used as PRN)
 * @param {String} invoiceId - Invoice ID
 * @param {Object} customerInfo - Customer information
 * @returns {Object} Payment initialization data
 */
export const initializeFonepayPayment = (amount, transactionId, invoiceId, customerInfo) => {
    const config = getFonepayConfig();

    try {
        // Generate checksum
        const checksum = generateFonepayChecksum(
            config.pid,
            config.merchantId,
            amount,
            transactionId,
            config.returnUrl
        );

        // Fonepay payment parameters
        return {
            PID: config.pid,
            MD: config.merchantId,
            AMT: amount.toString(),
            CRN: customerInfo.phone || "9800000000", // Customer Reference Number (phone)
            DT: "P", // Transaction Type (P = Payment)
            R1: customerInfo.name || "Customer", // Remarks 1
            R2: `Invoice: ${invoiceId}`, // Remarks 2
            DV: checksum, // Data Verification (checksum)
            RU: config.returnUrl, // Return URL
            PRN: transactionId, // Payment Reference Number (transaction ID)
            payment_url: config.paymentUrl,
        };
    } catch (error) {
        console.error("Fonepay payment initialization error:", error);
        throw new Error("Failed to initialize Fonepay payment");
    }
};

/**
 * Verify Fonepay payment
 * @param {String} prn - Payment Reference Number
 * @param {String} uid - Unique ID from Fonepay
 * @param {Number} amount - Transaction amount
 * @returns {Object} Verification response
 */
export const verifyFonepayPayment = (prn, uid, amount) => {
    const config = getFonepayConfig();

    try {
        // Generate verification checksum
        const message = `${config.pid},${config.merchantId},${prn},${uid},${amount},${config.secretKey}`;
        const checksum = CryptoJS.SHA512(message).toString(CryptoJS.enc.Hex);

        return {
            verifyUrl: config.verifyUrl,
            payload: {
                PID: config.pid,
                MD: config.merchantId,
                PRN: prn,
                UID: uid,
                AMT: amount.toString(),
                DV: checksum,
            },
        };
    } catch (error) {
        console.error("Fonepay verification error:", error);
        throw new Error("Failed to verify Fonepay payment");
    }
};
