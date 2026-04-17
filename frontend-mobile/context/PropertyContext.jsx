import React, { createContext, useState, useContext, useCallback } from "react";
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

    const getAuthHeader = useCallback(() => {
        return {
            headers: {
                Authorization: `Bearer ${user?.token}`,
            },
        };
    }, [user?.token]);

    const appendImagePayload = useCallback((formData, images = []) => {
        const retainedImages = [];

        for (const image of images) {
            if (!image) {
                continue;
            }

            if (String(image).startsWith("file://")) {
                const filename = image.split("/").pop();
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : "image/jpeg";

                formData.append("images", {
                    uri: image,
                    name: filename,
                    type,
                });
                continue;
            }

            retainedImages.push(image);
        }

        formData.append("imageUrls", JSON.stringify(retainedImages));
    }, []);

    const fetchProperties = useCallback(async () => {
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
    }, [API_URL, getAuthHeader]);

    const getPropertyById = useCallback(async (id) => {
        try {
            const response = await axios.get(`${API_URL}/${id}`, getAuthHeader());
            return response.data;
        } catch (err) {
            console.log(err);
            throw err;
        }
    }, [API_URL, getAuthHeader]);

    const addProperty = useCallback(async (propertyData) => {
        setLoading(true);
        try {
            const formData = new FormData();

            // Append text fields
            formData.append('title', propertyData.title);
            formData.append('address', propertyData.address);
            formData.append('district', propertyData.district);
            formData.append('type', propertyData.type);
            formData.append('units', propertyData.units);
            formData.append('splitMethod', propertyData.splitMethod);
            if (propertyData.rent) formData.append('rent', propertyData.rent);
            if (propertyData.description) formData.append('description', propertyData.description);

            // Append arrays as JSON strings
            if (propertyData.roomSizes && propertyData.roomSizes.length > 0) {
                formData.append("roomSizes", JSON.stringify(propertyData.roomSizes));
            }
            if (propertyData.amenities && propertyData.amenities.length > 0) {
                formData.append("amenities", JSON.stringify(propertyData.amenities));
            }

            appendImagePayload(formData, propertyData.images);

            const response = await axios.post(API_URL, formData, {
                headers: {
                    Authorization: `Bearer ${user?.token}`,
                    'Content-Type': 'multipart/form-data',
                },
            });
            setProperties((prev) => [...prev, response.data]);
            setError(null);
            return response.data;
        } catch (err) {
            console.log(err);
            setError(err.response?.data?.message || "Failed to create property");
            throw err;
        } finally {
            setLoading(false);
        }
    }, [API_URL, appendImagePayload, user?.token]);

    const updateProperty = useCallback(async (id, propertyData) => {
        setLoading(true);
        try {
            const formData = new FormData();

            // Append text fields
            formData.append('title', propertyData.title);
            formData.append('address', propertyData.address);
            formData.append('district', propertyData.district);
            formData.append('type', propertyData.type);
            formData.append('units', propertyData.units);
            formData.append('splitMethod', propertyData.splitMethod);
            formData.append('status', propertyData.status);
            formData.append('rent', propertyData.rent ?? 0);
            formData.append('description', propertyData.description ?? "");

            // Append arrays as JSON strings
            formData.append('roomSizes', JSON.stringify(propertyData.roomSizes || []));
            formData.append('amenities', JSON.stringify(propertyData.amenities || []));

            appendImagePayload(formData, propertyData.images);

            const response = await axios.put(`${API_URL}/${id}`, formData, {
                headers: {
                    Authorization: `Bearer ${user?.token}`,
                    'Content-Type': 'multipart/form-data',
                },
            });
            setProperties((prev) => prev.map((p) => (p._id === id ? response.data : p)));
            setError(null);
            return response.data;
        } catch (err) {
            console.log(err);
            setError(err.response?.data?.message || "Failed to update property");
            throw err;
        } finally {
            setLoading(false);
        }
    }, [API_URL, appendImagePayload, user?.token]);

    const deleteProperty = useCallback(async (id) => {
        setLoading(true);
        try {
            await axios.delete(`${API_URL}/${id}`, getAuthHeader());
            setProperties((prev) => prev.filter((prop) => prop._id !== id));
            setError(null);
        } catch (err) {
            console.log(err);
            setError(err.response?.data?.message || "Failed to delete property");
            throw err;
        } finally {
            setLoading(false);
        }
    }, [API_URL, getAuthHeader]);

    return (
        <PropertyContext.Provider
            value={{
                properties,
                loading,
                error,
                fetchProperties,
                getPropertyById,
                addProperty,
                updateProperty,
                deleteProperty,
            }}
        >
            {children}
        </PropertyContext.Provider>
    );
};
