import axios from "axios";

const KHALTI_CONFIG = {
    publicKey: process.env.KHALTI_PUBLIC_KEY,
    secretKey: process.env.KHALTI_SECRET_KEY,
    paymentUrl: process.env.KHALTI_PAYMENT_URL,
    lookupUrl: process.env.KHALTI_LOOKUP_URL,
    returnUrl: process.env.KHALTI_RETURN_URL,
    websiteUrl: process.env.KHALTI_WEBSITE_URL,
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
    try {
        // Khalti requires amount in paisa (1 NPR = 100 paisa)
        const amountInPaisa = Math.round(amount * 100);

        const payload = {
            return_url: KHALTI_CONFIG.returnUrl,
            website_url: KHALTI_CONFIG.websiteUrl,
            amount: amountInPaisa,
            purchase_order_id: transactionId,
            purchase_order_name: `Invoice Payment - ${invoiceId}`,
            customer_info: {
                name: customerInfo.name || "Customer",
                email: customerInfo.email || "customer@example.com",
                phone: customerInfo.phone || "9800000000",
            },
        };

        const response = await axios.post(KHALTI_CONFIG.paymentUrl, payload, {
            headers: {
                Authorization: `Key ${KHALTI_CONFIG.secretKey}`,
                "Content-Type": "application/json",
            },
        });

        return {
            pidx: response.data.pidx,
            payment_url: response.data.payment_url,
            expires_at: response.data.expires_at,
            expires_in: response.data.expires_in,
        };
    } catch (error) {
        console.error("Khalti payment initialization error:", error.response?.data || error.message);
        throw new Error(error.response?.data?.detail || "Failed to initialize Khalti payment");
    }
};

/**
 * Verify Khalti payment using lookup API
 * @param {String} pidx - Payment index from Khalti
 * @returns {Promise<Object>} Payment verification response
 */
export const verifyKhaltiPayment = async (pidx) => {
    try {
        const response = await axios.post(
            KHALTI_CONFIG.lookupUrl,
            { pidx },
            {
                headers: {
                    Authorization: `Key ${KHALTI_CONFIG.secretKey}`,
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
