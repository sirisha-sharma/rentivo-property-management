import axios from "axios";
import { API_BASE_URL } from "../constants/config";
import AsyncStorage from "@react-native-async-storage/async-storage";

// API client helpers for marketplace endpoints.

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

export const getMarketplaceProperties = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_BASE_URL}/properties/marketplace`, {
      headers,
    });
    return response.data;
  } catch (error) {
    console.error("Failed to fetch marketplace properties:", error.response?.data || error.message);
    throw error.response?.data || { message: "Failed to fetch properties" };
  }
};

export const getMarketplacePropertyDetail = async (propertyId) => {
  try {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_BASE_URL}/properties/marketplace/${propertyId}`, {
      headers,
    });
    return response.data;
  } catch (error) {
    console.error(
      "Failed to fetch property details:",
      error.response?.data || error.message
    );
    throw error.response?.data || { message: "Failed to fetch property details" };
  }
};

export const submitPropertyRating = async (propertyId, payload) => {
  try {
    const headers = await getAuthHeaders();
    const response = await axios.post(
      `${API_BASE_URL}/properties/${propertyId}/ratings`,
      payload,
      { headers }
    );
    return response.data;
  } catch (error) {
    console.error("Failed to save property rating:", error.response?.data || error.message);
    throw error.response?.data || { message: "Failed to save rating" };
  }
};
