import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../constants/config";

// API client helpers for subscription endpoints.

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

export const getCurrentSubscription = async () => {
    try {
        const headers = await getAuthHeaders();
        const response = await axios.get(`${API_BASE_URL}/subscriptions/current`, {
            headers,
        });
        return response.data;
    } catch (error) {
        console.error(
            "Failed to fetch subscription status:",
            error.response?.data || error.message
        );
        throw error.response?.data || { message: "Failed to fetch subscription status" };
    }
};

export const getSubscriptionConfig = async () => {
    try {
        const headers = await getAuthHeaders();
        const response = await axios.get(`${API_BASE_URL}/subscriptions/config`, {
            headers,
        });
        return response.data;
    } catch (error) {
        console.error(
            "Failed to fetch subscription config:",
            error.response?.data || error.message
        );
        throw error.response?.data || { message: "Failed to fetch subscription config" };
    }
};

export const initiateSubscriptionCheckout = async (
    plan,
    gateway,
    clientRedirectUri = null
) => {
    try {
        const headers = await getAuthHeaders();
        const response = await axios.post(
            `${API_BASE_URL}/subscriptions/checkout`,
            { plan, gateway, clientRedirectUri },
            { headers }
        );
        return response.data;
    } catch (error) {
        console.error(
            "Failed to initiate subscription checkout:",
            error.response?.data || error.message
        );
        throw error.response?.data || { message: "Failed to initiate subscription checkout" };
    }
};

export const getSubscriptionPayments = async () => {
    try {
        const headers = await getAuthHeaders();
        const response = await axios.get(`${API_BASE_URL}/subscriptions/payments`, {
            headers,
        });
        return response.data;
    } catch (error) {
        console.error(
            "Failed to fetch subscription payments:",
            error.response?.data || error.message
        );
        throw error.response?.data || { message: "Failed to fetch subscription payments" };
    }
};

export const getSubscriptionPaymentById = async (paymentId) => {
    try {
        const headers = await getAuthHeaders();
        const response = await axios.get(
            `${API_BASE_URL}/subscriptions/payments/${paymentId}`,
            { headers }
        );
        return response.data;
    } catch (error) {
        console.error(
            "Failed to fetch subscription payment:",
            error.response?.data || error.message
        );
        throw error.response?.data || { message: "Failed to fetch subscription payment" };
    }
};
