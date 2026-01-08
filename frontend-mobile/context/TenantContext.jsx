import React, { createContext, useState, useContext } from "react";
import axios from "axios";
import { AuthContext } from "./AuthContext";
import { API_BASE_URL } from "../constants/config";

export const TenantContext = createContext();

export const TenantProvider = ({ children }) => {
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const { user } = useContext(AuthContext);

    // Use your local updated IP if on physical device, or localhost for simulator
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

    return (
        <TenantContext.Provider
            value={{
                tenants,
                loading,
                error,
                fetchTenants,
                inviteTenant,
            }}
        >
            {children}
        </TenantContext.Provider>
    );
};
