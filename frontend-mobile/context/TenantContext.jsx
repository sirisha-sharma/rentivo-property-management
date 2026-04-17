import React, { createContext, useState, useContext, useCallback } from "react";
import axios from "axios";
import { AuthContext } from "./AuthContext";
import { API_BASE_URL } from "../constants/config";

export const TenantContext = createContext();

// Provides tenant invitation and tenant list operations to landlord flows.
export const TenantProvider = ({ children }) => {
    const [tenants, setTenants] = useState([]);
    const [invitations, setInvitations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const { user } = useContext(AuthContext);

    const API_URL = `${API_BASE_URL}/tenants`;

    const getAuthHeader = useCallback(() => {
        return {
            headers: {
                Authorization: `Bearer ${user?.token}`,
            },
        };
    }, [user?.token]);

    const fetchTenants = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get(API_URL, getAuthHeader());
            setTenants(response.data);
            setError(null);
        } catch (err) {
            console.log(err);
            setError(err.response?.data?.message || "Failed to fetch tenants");
        } finally {
            setLoading(false);
        }
    }, [API_URL, getAuthHeader]);

    const inviteTenant = useCallback(async (tenantData) => {
        setLoading(true);
        try {
            const response = await axios.post(API_URL, tenantData, getAuthHeader());
            setTenants((prev) => [...prev, response.data]);
            setError(null);
            return response.data;
        } catch (err) {
            console.log(err);
            setError(err.response?.data?.message || "Failed to invite tenant");
            throw err;
        } finally {
            setLoading(false);
        }
    }, [API_URL, getAuthHeader]);

    const deleteTenant = useCallback(async (id) => {
        try {
            await axios.delete(`${API_URL}/${id}`, getAuthHeader());
            setTenants((prev) => prev.filter((t) => t._id !== id));
            setError(null);
        } catch (err) {
            console.log(err);
            setError(err.response?.data?.message || "Failed to remove tenant");
            throw err;
        }
    }, [API_URL, getAuthHeader]);

    // These methods are only used by tenants, not landlords
    const fetchMyInvitations = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_URL}/my-invitations`, getAuthHeader());
            setInvitations(response.data);
            setError(null);
        } catch (err) {
            console.log(err);
            setError(err.response?.data?.message || "Failed to fetch invitations");
        } finally {
            setLoading(false);
        }
    }, [API_URL, getAuthHeader]);

    const acceptInvitation = useCallback(async (id) => {
        try {
            const response = await axios.put(`${API_URL}/${id}/accept`, {}, getAuthHeader());
            setInvitations((prev) => prev.map((inv) => (inv._id === id ? response.data : inv)));
            setError(null);
            return response.data;
        } catch (err) {
            console.log(err);
            setError(err.response?.data?.message || "Failed to accept invitation");
            throw err;
        }
    }, [API_URL, getAuthHeader]);

    const rejectInvitation = useCallback(async (id) => {
        try {
            await axios.put(`${API_URL}/${id}/reject`, {}, getAuthHeader());
            setInvitations((prev) => prev.filter((inv) => inv._id !== id));
            setError(null);
        } catch (err) {
            console.log(err);
            setError(err.response?.data?.message || "Failed to reject invitation");
            throw err;
        }
    }, [API_URL, getAuthHeader]);

    return (
        <TenantContext.Provider
            value={{
                tenants,
                invitations,
                loading,
                error,
                fetchTenants,
                inviteTenant,
                deleteTenant,
                fetchMyInvitations,
                acceptInvitation,
                rejectInvitation,
            }}
        >
            {children}
        </TenantContext.Provider>
    );
};
