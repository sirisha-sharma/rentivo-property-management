import axios from "axios";
import { API_BASE_URL } from "../constants/config";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Get authentication headers
 */
const getAuthHeaders = async () => {
    const userData = await AsyncStorage.getItem("user");

    if (!userData) {
        throw new Error("No authentication data found. Please login again.");
    }

    const user = JSON.parse(userData);
    const token = user?.token;

    if (!token) {
        throw new Error("No authentication token found. Please login again.");
    }

    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };
};

/**
 * Get available payment gateways
 */
export const getPaymentConfig = async () => {
    try {
        const headers = await getAuthHeaders();
        const response = await axios.get(`${API_BASE_URL}/payments/config`, {
            headers,
        });
        return response.data;
    } catch (error) {
        console.error("Failed to fetch payment config:", error.response?.data || error.message);
        throw error.response?.data || { message: "Failed to fetch payment configuration" };
    }
};

/**
 * Initiate payment for an invoice
 * @param {string} invoiceId - Invoice ID
 * @param {string} gateway - Payment gateway (esewa or khalti)
 */
export const initiatePayment = async (invoiceId, gateway, clientRedirectUri = null) => {
    try {
        const headers = await getAuthHeaders();
        const response = await axios.post(
            `${API_BASE_URL}/payments/initiate`,
            { invoiceId, gateway, clientRedirectUri },
            { headers }
        );
        return response.data;
    } catch (error) {
        console.error("Failed to initiate payment:", error.response?.data || error.message);
        throw error.response?.data || { message: "Failed to initiate payment" };
    }
};

/**
 * Get payment history for current user
 */
export const getPaymentHistory = async () => {
    try {
        const headers = await getAuthHeaders();
        const response = await axios.get(`${API_BASE_URL}/payments/history`, {
            headers,
        });
        return response.data;
    } catch (error) {
        console.error("Failed to fetch payment history:", error.response?.data || error.message);
        throw error.response?.data || { message: "Failed to fetch payment history" };
    }
};

/**
 * Get payment by ID
 * @param {string} paymentId - Payment ID
 */
export const getPaymentById = async (paymentId) => {
    try {
        const headers = await getAuthHeaders();
        const response = await axios.get(`${API_BASE_URL}/payments/${paymentId}`, {
            headers,
        });
        return response.data;
    } catch (error) {
        console.error("Failed to fetch payment:", error.response?.data || error.message);
        throw error.response?.data || { message: "Failed to fetch payment details" };
    }
};
