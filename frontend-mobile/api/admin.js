import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { API_BASE_URL } from "../constants/config";

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

const getRequest = async (path, params = {}) => {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_BASE_URL}/admin${path}`, {
        headers,
        params,
    });
    return response.data;
};

export const getAdminOverview = async () => {
    try {
        return await getRequest("/overview");
    } catch (error) {
        console.error(
            "Failed to fetch admin overview:",
            error.response?.data || error.message
        );
        throw error.response?.data || { message: "Failed to fetch admin overview" };
    }
};

export const getAdminUsers = async (params = {}) => {
    try {
        return await getRequest("/users", params);
    } catch (error) {
        console.error("Failed to fetch admin users:", error.response?.data || error.message);
        throw error.response?.data || { message: "Failed to fetch admin users" };
    }
};

export const updateAdminUserStatus = async (userId, isActive) => {
    try {
        const headers = await getAuthHeaders();
        const response = await axios.patch(
            `${API_BASE_URL}/admin/users/${userId}/status`,
            { isActive },
            { headers }
        );
        return response.data;
    } catch (error) {
        console.error(
            "Failed to update admin user status:",
            error.response?.data || error.message
        );
        throw error.response?.data || { message: "Failed to update user status" };
    }
};

export const getAdminProperties = async (params = {}) => {
    try {
        return await getRequest("/properties", params);
    } catch (error) {
        console.error(
            "Failed to fetch admin properties:",
            error.response?.data || error.message
        );
        throw error.response?.data || { message: "Failed to fetch admin properties" };
    }
};

export const getAdminTenancies = async (params = {}) => {
    try {
        return await getRequest("/tenancies", params);
    } catch (error) {
        console.error(
            "Failed to fetch admin tenancies:",
            error.response?.data || error.message
        );
        throw error.response?.data || { message: "Failed to fetch admin tenancies" };
    }
};

export const getAdminInvoices = async (params = {}) => {
    try {
        return await getRequest("/invoices", params);
    } catch (error) {
        console.error(
            "Failed to fetch admin invoices:",
            error.response?.data || error.message
        );
        throw error.response?.data || { message: "Failed to fetch admin invoices" };
    }
};

export const getAdminMaintenance = async (params = {}) => {
    try {
        return await getRequest("/maintenance", params);
    } catch (error) {
        console.error(
            "Failed to fetch admin maintenance:",
            error.response?.data || error.message
        );
        throw error.response?.data || { message: "Failed to fetch admin maintenance" };
    }
};

export const getAdminSubscriptions = async (params = {}) => {
    try {
        return await getRequest("/subscriptions", params);
    } catch (error) {
        console.error(
            "Failed to fetch admin subscriptions:",
            error.response?.data || error.message
        );
        throw error.response?.data || { message: "Failed to fetch admin subscriptions" };
    }
};

export const deleteAdminProperty = async (propertyId) => {
    try {
        const headers = await getAuthHeaders();
        const response = await axios.delete(
            `${API_BASE_URL}/admin/properties/${propertyId}`,
            { headers }
        );
        return response.data;
    } catch (error) {
        console.error(
            "Failed to delete admin property:",
            error.response?.data || error.message
        );
        throw error.response?.data || { message: "Failed to delete property" };
    }
};
