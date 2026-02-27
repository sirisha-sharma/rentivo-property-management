import React, { createContext, useState } from "react";

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);

    // Add a notification
    const addNotification = ({ type, message }) => {
        const newNotif = {
            _id: Date.now().toString(),
            type,
            message,
            read: false,
            createdAt: new Date().toISOString(),
        };
        setNotifications((prev) => [newNotif, ...prev]);
    };

    // Mark one as read
    const markAsRead = (id) => {
        setNotifications((prev) =>
            prev.map((n) => (n._id === id ? { ...n, read: true } : n))
        );
    };

    // Mark all as read
    const markAllAsRead = () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    };

    // Delete a notification
    const deleteNotification = (id) => {
        setNotifications((prev) => prev.filter((n) => n._id !== id));
    };

    // Unread count
    const unreadCount = notifications.filter((n) => !n.read).length;

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                addNotification,
                markAsRead,
                markAllAsRead,
                deleteNotification,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
};
