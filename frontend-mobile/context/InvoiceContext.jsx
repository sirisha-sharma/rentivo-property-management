import React, { createContext, useCallback, useState, useContext } from "react";
import axios from "axios";
import { AuthContext } from "./AuthContext";
import { API_BASE_URL } from "../constants/config";

// Create the InvoiceContext for state management
export const InvoiceContext = createContext();

// InvoiceProvider component that wraps the app and provides invoice state
// This provider handles all invoice-related API calls and state management
export const InvoiceProvider = ({ children }) => {
    // State for storing list of invoices
    const [invoices, setInvoices] = useState([]);
    // Loading state for API operations
    const [loading, setLoading] = useState(false);
    // Error state for handling API errors
    const [error, setError] = useState(null);

    // Get user from AuthContext for authentication
    const { user } = useContext(AuthContext);

    // Base URL for invoice API endpoints
    const API_URL = `${API_BASE_URL}/invoices`;

    // Helper function to get authorization header with JWT token
    const getAuthHeader = useCallback(() => {
        return {
            headers: {
                Authorization: `Bearer ${user?.token}`,
            },
        };
    }, [user?.token]);

    // Fetch all invoices from API
    // For landlords: returns invoices they created
    // For tenants: returns invoices issued to them
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

    // Create a new invoice (landlord only)
    // Adds the new invoice to the local state after creation
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

    // Update invoice status (landlord only)
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

    // Delete an invoice (landlord only)
    // Removes the invoice from local state after deletion
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

    // Provide invoice state and methods to child components
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
