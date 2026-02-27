import React, { createContext, useState, useContext } from "react";
import axios from "axios";
import { AuthContext } from "./AuthContext";
import { API_BASE_URL } from "../constants/config";

export const DocumentContext = createContext();

export const DocumentProvider = ({ children }) => {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const { user } = useContext(AuthContext);

    const API_URL = `${API_BASE_URL}/documents`;

    const getAuthHeader = () => ({
        headers: { Authorization: `Bearer ${user?.token}` },
    });

    // Fetch all documents
    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const response = await axios.get(API_URL, getAuthHeader());
            setDocuments(response.data);
            setError(null);
        } catch (err) {
            console.log(err);
            setError(err.response?.data?.message || "Failed to fetch documents");
        } finally {
            setLoading(false);
        }
    };

    // Upload a new document with file
    const uploadDocument = async (formData) => {
        setLoading(true);
        try {
            const response = await axios.post(API_URL, formData, {
                headers: {
                    Authorization: `Bearer ${user?.token}`,
                    "Content-Type": "multipart/form-data",
                },
            });
            setDocuments((prev) => [response.data, ...prev]);
            setError(null);
            return response.data;
        } catch (err) {
            console.log(err);
            setError(err.response?.data?.message || "Failed to upload document");
            throw err;
        } finally {
            setLoading(false);
        }
    };

    // Delete a document
    const deleteDocument = async (id) => {
        try {
            await axios.delete(`${API_URL}/${id}`, getAuthHeader());
            setDocuments((prev) => prev.filter((d) => d._id !== id));
            setError(null);
        } catch (err) {
            console.log(err);
            setError(err.response?.data?.message || "Failed to delete document");
            throw err;
        }
    };

    return (
        <DocumentContext.Provider
            value={{
                documents,
                loading,
                error,
                fetchDocuments,
                uploadDocument,
                deleteDocument,
            }}
        >
            {children}
        </DocumentContext.Provider>
    );
};
