import axios from "axios";
import { API_BASE_URL } from "../constants/config";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Get authentication headers
 */
const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem("token");
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };
};

/**
 * Get invoice by ID
 * @param {string} invoiceId - Invoice ID
 */
export const getInvoiceById = async (invoiceId) => {
    try {
        const headers = await getAuthHeaders();
        const response = await axios.get(`${API_BASE_URL}/invoices/${invoiceId}`, {
            headers,
        });
        return response.data;
    } catch (error) {
        console.error("Failed to fetch invoice:", error.response?.data || error.message);
        throw error.response?.data || { message: "Failed to fetch invoice details" };
    }
};
