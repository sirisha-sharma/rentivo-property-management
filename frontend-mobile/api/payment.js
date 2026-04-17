import axios from "axios";
import { API_BASE_URL } from "../constants/config";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Build auth headers from the stored session before payment API calls.
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

// clientRedirectUri is used for gateway redirect flows (esewa, khalti)
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
