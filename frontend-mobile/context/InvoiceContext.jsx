import React, { createContext, useState, useContext } from "react";
import axios from "axios";
import { AuthContext } from "./AuthContext";
import { API_BASE_URL } from "../constants/config";

export const InvoiceContext = createContext();

export const InvoiceProvider = ({ children }) => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const { user } = useContext(AuthContext);

    const API_URL = `${API_BASE_URL}/invoices`;

    const getAuthHeader = () => {
        return {
            headers: {
                Authorization: `Bearer ${user?.token}`,
            },
        };
    };

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const response = await axios.get(API_URL, getAuthHeader());
            setInvoices(response.data);
            setError(null);
        } catch (err) {
            console.log(err);
            setError(err.response?.data?.message || "Failed to fetch invoices");
        } finally {
            setLoading(false);
        }
    };

    const createInvoice = async (invoiceData) => {
        setLoading(true);
        try {
            const response = await axios.post(API_URL, invoiceData, getAuthHeader());
            setInvoices([...invoices, response.data]);
            setError(null);
            return response.data;
        } catch (err) {
            console.log(err);
            setError(err.response?.data?.message || "Failed to create invoice");
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const updateInvoiceStatus = async (id, status) => {
        try {
            const response = await axios.put(`${API_URL}/${id}/status`, { status }, getAuthHeader());
            setInvoices(invoices.map((inv) => (inv._id === id ? response.data : inv)));
            setError(null);
            return response.data;
        } catch (err) {
            console.log(err);
            setError(err.response?.data?.message || "Failed to update invoice status");
            throw err;
        }
    };

    const deleteInvoice = async (id) => {
        try {
            await axios.delete(`${API_URL}/${id}`, getAuthHeader());
            setInvoices(invoices.filter((inv) => inv._id !== id));
            setError(null);
        } catch (err) {
            console.log(err);
            setError(err.response?.data?.message || "Failed to delete invoice");
            throw err;
        }
    };

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
            }}
        >
            {children}
        </InvoiceContext.Provider>
    );
};
