import React, { createContext, useState, useContext } from "react";
import axios from "axios";
import { AuthContext } from "./AuthContext";
import { API_BASE_URL } from "../constants/config";

export const PropertyContext = createContext();

export const PropertyProvider = ({ children }) => {
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const { user } = useContext(AuthContext);

    // Use your local updated IP if on physical device, or localhost for simulator
    const API_URL = `${API_BASE_URL}/properties`;

    const getAuthHeader = () => {
        return {
            headers: {
                Authorization: `Bearer ${user?.token}`,
            },
        };
    };

    const fetchProperties = async () => {
        setLoading(true);
        try {
            const response = await axios.get(API_URL, getAuthHeader());
            setProperties(response.data);
            setError(null);
        } catch (err) {
            console.log(err);
            setError(err.response?.data?.message || "Failed to fetch properties");
        } finally {
            setLoading(false);
        }
    };

    const addProperty = async (propertyData) => {
        setLoading(true);
        try {
            const response = await axios.post(API_URL, propertyData, getAuthHeader());
            setProperties([...properties, response.data]);
            setError(null);
            return response.data;
        } catch (err) {
            console.log(err);
            setError(err.response?.data?.message || "Failed to create property");
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const deleteProperty = async (id) => {
        setLoading(true);
        try {
            await axios.delete(`${API_URL}/${id}`, getAuthHeader());
            setProperties(properties.filter((prop) => prop._id !== id));
            setError(null);
        } catch (err) {
            console.log(err);
            setError(err.response?.data?.message || "Failed to delete property");
        } finally {
            setLoading(false);
        }
    };

    return (
        <PropertyContext.Provider
            value={{
                properties,
                loading,
                error,
                fetchProperties,
                addProperty,
                deleteProperty,
            }}
        >
            {children}
        </PropertyContext.Provider>
    );
};
