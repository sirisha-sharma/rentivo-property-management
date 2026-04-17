import React, { createContext, useCallback, useState, useContext } from "react";
import axios from "axios";
import { AuthContext } from "./AuthContext";
import { API_BASE_URL } from "../constants/config";

export const InvoiceContext = createContext();

// Provides invoice CRUD actions and invoice list state to tenant/landlord screens.
export const InvoiceProvider = ({ children }) => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const { user } = useContext(AuthContext);

    const API_URL = `${API_BASE_URL}/invoices`;

    const getAuthHeader = useCallback(() => {
        return {
            headers: {
                Authorization: `Bearer ${user?.token}`,
            },
        };
    }, [user?.token]);

    // Backend filters by role - landlords see what they created, tenants see what's issued to them
    const fetchInvoices = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get(API_URL, getAuthHeader());
            setInvoices(response.data);
            setError(null);
            return response.data;
        } catch (err) {
            console.log(err);
            setError(err.response?.data?.message || "Failed to fetch invoices");
        } finally {
            setLoading(false);
        }
    }, [API_URL, getAuthHeader]);

    const createInvoice = useCallback(async (invoiceData) => {
        setLoading(true);
        try {
            const response = await axios.post(API_URL, invoiceData, getAuthHeader());
            setInvoices((prev) => [...prev, response.data]);
            setError(null);
            return response.data;
        } catch (err) {
            console.log(err);
            setError(err.response?.data?.message || "Failed to create invoice");
            throw err;
        } finally {
            setLoading(false);
        }
    }, [API_URL, getAuthHeader]);

    // Allowed statuses: Pending, Paid, Overdue
    const updateInvoiceStatus = useCallback(async (id, status) => {
        try {
            const response = await axios.put(`${API_URL}/${id}/status`, { status }, getAuthHeader());
            setInvoices((prev) => prev.map((inv) => (inv._id === id ? response.data : inv)));
            setError(null);
            return response.data;
        } catch (err) {
            console.log(err);
            setError(err.response?.data?.message || "Failed to update invoice status");
            throw err;
        }
    }, [API_URL, getAuthHeader]);

    const deleteInvoice = useCallback(async (id) => {
        try {
            await axios.delete(`${API_URL}/${id}`, getAuthHeader());
            setInvoices((prev) => prev.filter((inv) => inv._id !== id));
            setError(null);
        } catch (err) {
            console.log(err);
            setError(err.response?.data?.message || "Failed to delete invoice");
            throw err;
        }
    }, [API_URL, getAuthHeader]);

    // Splits a utility bill across tenants and merges the resulting invoices into state,
    // replacing any existing ones with the same IDs to avoid duplicates
    const splitUtilityBill = useCallback(async (formData) => {
        try {
            const response = await axios.post(`${API_URL}/split-utility-bill`, formData, {
                headers: {
                    Authorization: `Bearer ${user?.token}`,
                    "Content-Type": "multipart/form-data",
                },
            });

            const createdInvoices = response.data?.invoices || [];
            const createdIds = new Set(createdInvoices.map((invoice) => invoice._id));

            setInvoices((prev) => [
                ...createdInvoices,
                ...prev.filter((invoice) => !createdIds.has(invoice._id)),
            ]);
            setError(null);
            return response.data;
        } catch (err) {
            console.log(err);
            setError(err.response?.data?.message || "Failed to split utility bill");
            throw err;
        }
    }, [API_URL, user?.token]);

    return (
        <InvoiceContext.Provider
            value={{
                invoices,
                loading,
                error,
                fetchInvoices,
                createInvoice,
                updateInvoiceStatus,
                deleteInvoice,
                splitUtilityBill,
            }}
        >
            {children}
        </InvoiceContext.Provider>
    );
};
