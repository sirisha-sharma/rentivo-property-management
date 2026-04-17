import React, { createContext, useCallback, useState, useContext } from "react";
import axios from "axios";
import { AuthContext } from "./AuthContext";
import { API_BASE_URL } from "../constants/config";

export const NotificationContext = createContext();

// Manages notification fetch/read actions and unread counters.
export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);

    const { user } = useContext(AuthContext);

    const API_URL = `${API_BASE_URL}/notifications`;

    const getAuthHeader = useCallback(() => ({
        headers: { Authorization: `Bearer ${user?.token}` },
    }), [user?.token]);

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get(API_URL, getAuthHeader());
            setNotifications(response.data);
            return response.data;
        } catch (err) {
            console.log("Failed to fetch notifications:", err);
        } finally {
            setLoading(false);
        }
    }, [API_URL, getAuthHeader]);

    const markAsRead = useCallback(async (id) => {
        try {
            await axios.put(`${API_URL}/${id}/read`, {}, getAuthHeader());
            setNotifications((prev) =>
                prev.map((n) => (n._id === id ? { ...n, read: true } : n))
            );
        } catch (err) {
            console.log("Failed to mark as read:", err);
        }
    }, [API_URL, getAuthHeader]);

    const markAllAsRead = useCallback(async () => {
        try {
            await axios.put(`${API_URL}/read-all`, {}, getAuthHeader());
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        } catch (err) {
            console.log("Failed to mark all as read:", err);
        }
    }, [API_URL, getAuthHeader]);

    const deleteNotification = useCallback(async (id) => {
        try {
            await axios.delete(`${API_URL}/${id}`, getAuthHeader());
            setNotifications((prev) => prev.filter((n) => n._id !== id));
        } catch (err) {
            console.log("Failed to delete notification:", err);
        }
    }, [API_URL, getAuthHeader]);

    // Derived from local state so it stays in sync without an extra API call
    const unreadCount = notifications.filter((n) => !n.read).length;

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                loading,
                unreadCount,
                fetchNotifications,
                markAsRead,
                markAllAsRead,
                deleteNotification,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
};
