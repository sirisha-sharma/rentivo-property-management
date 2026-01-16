import React, { createContext, useState, useContext } from "react";
import axios from "axios";
import { AuthContext } from "./AuthContext";
import { API_BASE_URL } from "../constants/config";

export const TenantContext = createContext();

export const TenantProvider = ({ children }) => {
    const [tenants, setTenants] = useState([]);
    const [invitations, setInvitations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const { user } = useContext(AuthContext);

    const API_URL = `${API_BASE_URL}/tenants`;

    const getAuthHeader = () => {
        return {
            headers: {
                Authorization: `Bearer ${user?.token}`,
            },
        };
    };

    const fetchTenants = async () => {
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
    };

    const inviteTenant = async (tenantData) => {
        setLoading(true);
        try {
            const response = await axios.post(API_URL, tenantData, getAuthHeader());
            setTenants([...tenants, response.data]);
            setError(null);
            return response.data;
        } catch (err) {
            console.log(err);
            setError(err.response?.data?.message || "Failed to invite tenant");
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const deleteTenant = async (id) => {
        try {
            await axios.delete(`${API_URL}/${id}`, getAuthHeader());
            setTenants(tenants.filter((t) => t._id !== id));
            setError(null);
        } catch (err) {
            console.log(err);
            setError(err.response?.data?.message || "Failed to remove tenant");
            throw err;
        }
    };

    // Tenant-specific methods
    const fetchMyInvitations = async () => {
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
    };

    const acceptInvitation = async (id) => {
        try {
            const response = await axios.put(`${API_URL}/${id}/accept`, {}, getAuthHeader());
            setInvitations(invitations.map(inv => inv._id === id ? response.data : inv));
            setError(null);
            return response.data;
        } catch (err) {
            console.log(err);
            setError(err.response?.data?.message || "Failed to accept invitation");
            throw err;
        }
    };

    const rejectInvitation = async (id) => {
        try {
            await axios.put(`${API_URL}/${id}/reject`, {}, getAuthHeader());
            setInvitations(invitations.filter(inv => inv._id !== id));
            setError(null);
        } catch (err) {
            console.log(err);
            setError(err.response?.data?.message || "Failed to reject invitation");
            throw err;
        }
    };

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
