import React, { createContext, useState, useContext } from "react";
import axios from "axios";
import { AuthContext } from "./AuthContext";
import { API_BASE_URL } from "../constants/config";

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);

    const { user } = useContext(AuthContext);

    const API_URL = `${API_BASE_URL}/notifications`;

    const getAuthHeader = () => ({
        headers: { Authorization: `Bearer ${user?.token}` },
    });

    // Fetch all notifications
    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const response = await axios.get(API_URL, getAuthHeader());
            setNotifications(response.data);
        } catch (err) {
            console.log("Failed to fetch notifications:", err);
        } finally {
            setLoading(false);
        }
    };

    // Mark one as read
    const markAsRead = async (id) => {
        try {
            await axios.put(`${API_URL}/${id}/read`, {}, getAuthHeader());
            setNotifications((prev) =>
                prev.map((n) => (n._id === id ? { ...n, read: true } : n))
            );
        } catch (err) {
            console.log("Failed to mark as read:", err);
        }
    };

    // Mark all as read
    const markAllAsRead = async () => {
        try {
            await axios.put(`${API_URL}/read-all`, {}, getAuthHeader());
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        } catch (err) {
            console.log("Failed to mark all as read:", err);
        }
    };

    // Delete a notification
    const deleteNotification = async (id) => {
        try {
            await axios.delete(`${API_URL}/${id}`, getAuthHeader());
            setNotifications((prev) => prev.filter((n) => n._id !== id));
        } catch (err) {
            console.log("Failed to delete notification:", err);
        }
    };

    // Unread count
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
