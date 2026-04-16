import React, { createContext, useState, useContext } from "react";
import axios from "axios";
import { AuthContext } from "./AuthContext";
import { API_BASE_URL } from "../constants/config";

// Create the MaintenanceContext for state management
export const MaintenanceContext = createContext();

// MaintenanceProvider component that wraps the app and provides maintenance request state
// This provider handles all maintenance-related API calls and state management
export const MaintenanceProvider = ({ children }) => {
    // State for storing list of maintenance requests
    const [requests, setRequests] = useState([]);
    // Loading state for API operations
    const [loading, setLoading] = useState(false);
    // Error state for handling API errors
    const [error, setError] = useState(null);

    // Get user from AuthContext for authentication
    const { user } = useContext(AuthContext);

    // Base URL for maintenance API endpoints
    const API_URL = `${API_BASE_URL}/maintenance`;

    // Helper function to get authorization header with JWT token
    const getAuthHeader = () => {
        return {
            headers: {
                Authorization: `Bearer ${user?.token}`,
            },
        };
    };

    // Fetch all maintenance requests from API
    // For landlords: returns requests for their properties
    // For tenants: returns requests they submitted
    const fetchRequests = async () => {
        setLoading(true);
        try {
            const response = await axios.get(API_URL, getAuthHeader());
            setRequests(response.data);
            setError(null);
        } catch (err) {
            console.log(err);
            setError(err.response?.data?.message || "Failed to fetch maintenance requests");
        } finally {
            setLoading(false);
        }
    };

    // Get a single maintenance request by ID
    const getRequestById = async (id) => {
        try {
            const response = await axios.get(`${API_URL}/${id}`, getAuthHeader());
            return response.data;
        } catch (err) {
            console.log(err);
            throw err;
        }
    };

    // Create a new maintenance request (tenant only)
    // Adds the new request to the local state after creation
    const createRequest = async (requestData) => {
        setLoading(true);
        try {
            const response = await axios.post(API_URL, requestData, getAuthHeader());
            setRequests([...requests, response.data]);
            setError(null);
            return response.data;
        } catch (err) {
            console.log(err);
            setError(err.response?.data?.message || "Failed to create maintenance request");
            throw err;
        } finally {
            setLoading(false);
        }
    };

    // Update maintenance request status (landlord only)
    // Allowed statuses: Open, In Progress, Resolved
    const updateRequestStatus = async (id, status) => {
        try {
            const response = await axios.put(`${API_URL}/${id}/status`, { status }, getAuthHeader());
            setRequests(requests.map((req) => (req._id === id ? response.data : req)));
            setError(null);
            return response.data;
        } catch (err) {
            console.log(err);
            setError(err.response?.data?.message || "Failed to update request status");
            throw err;
        }
    };

    // Delete a maintenance request (landlord only)
    // Removes the request from local state after deletion
    const deleteRequest = async (id) => {
        try {
            await axios.delete(`${API_URL}/${id}`, getAuthHeader());
            setRequests(requests.filter((req) => req._id !== id));
            setError(null);
        } catch (err) {
            console.log(err);
            setError(err.response?.data?.message || "Failed to delete maintenance request");
            throw err;
        }
    };

    // Provide maintenance state and methods to child components
    return (
        <MaintenanceContext.Provider
            value={{
                requests,
                loading,
                error,
                fetchRequests,
                getRequestById,
                createRequest,
                updateRequestStatus,
                deleteRequest,
            }}
        >
            {children}
        </MaintenanceContext.Provider>
    );
};
