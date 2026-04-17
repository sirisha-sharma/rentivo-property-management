import axios from "axios";
import { API_BASE_URL } from "../constants/config";
import AsyncStorage from "@react-native-async-storage/async-storage";

const getAuthHeaders = async () => {
    const userData = await AsyncStorage.getItem("user");
    if (!userData) throw new Error("No authentication data found. Please login again.");
    const user = JSON.parse(userData);
    const token = user?.token;
    if (!token) throw new Error("No authentication token found. Please login again.");
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };
};

export const getUnits = async (propertyId) => {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_BASE_URL}/units?propertyId=${propertyId}`, { headers });
    return response.data;
};

export const createUnit = async (data) => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_BASE_URL}/units`, data, { headers });
    return response.data;
};

export const updateUnit = async (id, data) => {
    const headers = await getAuthHeaders();
    const response = await axios.put(`${API_BASE_URL}/units/${id}`, data, { headers });
    return response.data;
};

export const deleteUnit = async (id) => {
    const headers = await getAuthHeaders();
    const response = await axios.delete(`${API_BASE_URL}/units/${id}`, { headers });
    return response.data;
};
