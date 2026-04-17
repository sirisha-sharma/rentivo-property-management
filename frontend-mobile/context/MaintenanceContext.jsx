import React, { createContext, useState, useContext, useCallback } from "react";
import axios from "axios";
import { AuthContext } from "./AuthContext";
import { API_BASE_URL } from "../constants/config";

export const MaintenanceContext = createContext();

// Shares maintenance request state and actions across maintenance screens.
export const MaintenanceProvider = ({ children }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const { user } = useContext(AuthContext);

    const API_URL = `${API_BASE_URL}/maintenance`;

    const getAuthHeader = useCallback(() => {
        return {
            headers: {
                Authorization: `Bearer ${user?.token}`,
            },
        };
    }, [user?.token]);

    // Backend scopes results by role - landlords see all requests for their properties,
    // tenants only see their own
    const fetchRequests = useCallback(async () => {
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
    }, [API_URL, getAuthHeader]);

    const getRequestById = useCallback(async (id) => {
        try {
            const response = await axios.get(`${API_URL}/${id}`, getAuthHeader());
            return response.data;
        } catch (err) {
            console.log(err);
            throw err;
        }
    }, [API_URL, getAuthHeader]);

    // Builds a FormData payload to support optional photo attachments
    const createRequest = useCallback(async (requestData) => {
        setLoading(true);
        try {
            const formData = new FormData();
            const authHeader = getAuthHeader();

            formData.append("propertyId", requestData.propertyId);
            formData.append("title", requestData.title);

            if (requestData.description) {
                formData.append("description", requestData.description);
            }

            if (requestData.urgency || requestData.priority) {
                formData.append("urgency", requestData.urgency || requestData.priority);
            }

            (requestData.photos || []).forEach((photo, index) => {
                const uri = photo?.uri || photo;
                if (!uri) {
                    return;
                }

                const fallbackName = uri.split("/").pop() || `maintenance-${index + 1}.jpg`;
                const fileName = photo?.fileName || photo?.name || fallbackName;
                const extensionMatch = /\.(\w+)$/.exec(fileName);
                const mimeType =
                    photo?.mimeType ||
                    photo?.type ||
                    (extensionMatch ? `image/${extensionMatch[1].toLowerCase()}` : "image/jpeg");

                formData.append("photos", {
                    uri,
                    name: fileName,
                    type: mimeType,
                });
            });

            const response = await axios.post(API_URL, formData, {
                headers: {
                    ...authHeader.headers,
                    "Content-Type": "multipart/form-data",
                },
            });
            setRequests((prev) => [...prev, response.data]);
            setError(null);
            return response.data;
        } catch (err) {
            console.log(err);
            setError(err.response?.data?.message || "Failed to create maintenance request");
            throw err;
        } finally {
            setLoading(false);
        }
    }, [API_URL, getAuthHeader]);

    // Allowed statuses: Open, In Progress, Resolved
    const updateRequestStatus = useCallback(async (id, status) => {
        try {
            const response = await axios.put(`${API_URL}/${id}/status`, { status }, getAuthHeader());
            setRequests((prev) => prev.map((req) => (req._id === id ? response.data : req)));
            setError(null);
            return response.data;
        } catch (err) {
            console.log(err);
            setError(err.response?.data?.message || "Failed to update request status");
            throw err;
        }
    }, [API_URL, getAuthHeader]);

    const deleteRequest = useCallback(async (id) => {
        try {
            await axios.delete(`${API_URL}/${id}`, getAuthHeader());
            setRequests((prev) => prev.filter((req) => req._id !== id));
            setError(null);
        } catch (err) {
            console.log(err);
            setError(err.response?.data?.message || "Failed to delete maintenance request");
            throw err;
        }
    }, [API_URL, getAuthHeader]);

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
