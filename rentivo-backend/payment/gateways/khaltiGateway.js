import axios from "axios";

/**
 * Get Khalti configuration (lazy-loaded to ensure env vars are available)
 */
const getKhaltiConfig = () => {
    const config = {
        publicKey: process.env.KHALTI_PUBLIC_KEY,
        secretKey: process.env.KHALTI_SECRET_KEY,
        paymentUrl: process.env.KHALTI_PAYMENT_URL,
        lookupUrl: process.env.KHALTI_LOOKUP_URL,
        returnUrl: process.env.KHALTI_RETURN_URL,
        websiteUrl: process.env.KHALTI_WEBSITE_URL,
    };

    if (!config.secretKey) {
        throw new Error("Khalti secret key is not configured. Check KHALTI_SECRET_KEY in .env file");
    }

    if (!config.publicKey) {
        throw new Error("Khalti public key is not configured. Check KHALTI_PUBLIC_KEY in .env file");
    }

    return config;
};

/**
 * Initialize Khalti payment
 * @param {Number} amount - Payment amount in NPR
 * @param {String} transactionId - Transaction ID
 * @param {String} invoiceId - Invoice ID
 * @param {Object} customerInfo - Customer information
 * @returns {Promise<Object>} Payment initialization response
 */
export const initializeKhaltiPayment = async (amount, transactionId, invoiceId, customerInfo) => {
    const config = getKhaltiConfig();

    try {
        // Khalti requires amount in paisa (1 NPR = 100 paisa)
        const amountInPaisa = Math.round(amount * 100);

        const payload = {
            return_url: config.returnUrl,
            website_url: config.websiteUrl,
            amount: amountInPaisa,
            purchase_order_id: transactionId,
            purchase_order_name: `Invoice Payment - ${invoiceId}`,
            customer_info: {
                name: customerInfo.name || "Customer",
                email: customerInfo.email || "customer@example.com",
                phone: customerInfo.phone || "9800000000",
            },
        };

        console.log("Khalti API Request:", {
            url: config.paymentUrl,
            secretKeyPrefix: config.secretKey?.substring(0, 8) + "...",
            amount: amountInPaisa,
            transactionId,
        });

        const response = await axios.post(config.paymentUrl, payload, {
            headers: {
                Authorization: `key ${config.secretKey}`,
                "Content-Type": "application/json",
            },
        });

        console.log("Khalti API Response Success:", response.data);

        return {
            pidx: response.data.pidx,
            payment_url: response.data.payment_url,
            expires_at: response.data.expires_at,
            expires_in: response.data.expires_in,
        };
    } catch (error) {
        console.error("Khalti payment initialization error details:", {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message,
        });

        // Extract error message from Khalti response
        let errorMessage = "Failed to initialize Khalti payment";

        if (error.response?.data) {
            const khaltiError = error.response.data;
            if (khaltiError.detail) {
                errorMessage = khaltiError.detail;
            } else if (khaltiError.error_key) {
                errorMessage = `Khalti Error: ${khaltiError.error_key}`;
            } else if (typeof khaltiError === 'string') {
                errorMessage = khaltiError;
            }
        }

        throw new Error(errorMessage);
    }
};

/**
 * Verify Khalti payment using lookup API
 * @param {String} pidx - Payment index from Khalti
 * @returns {Promise<Object>} Payment verification response
 */
export const verifyKhaltiPayment = async (pidx) => {
    const config = getKhaltiConfig();

    try {
        const response = await axios.post(
            config.lookupUrl,
            { pidx },
            {
                headers: {
                    Authorization: `key ${config.secretKey}`,
                    "Content-Type": "application/json",
                },
            }
        );

        return {
            pidx: response.data.pidx,
            total_amount: response.data.total_amount,
            status: response.data.status,
            transaction_id: response.data.transaction_id,
            fee: response.data.fee,
            refunded: response.data.refunded,
        };
    } catch (error) {
        console.error("Khalti payment verification error:", error.response?.data || error.message);
        throw new Error(error.response?.data?.detail || "Failed to verify Khalti payment");
    }
};
