import React, { createContext, useCallback, useState, useContext } from "react";
import axios from "axios";
import { AuthContext } from "./AuthContext";
import { API_BASE_URL } from "../constants/config";

// React context provider for messagecontext state.

export const MessageContext = createContext();

export const MessageProvider = ({ children }) => {
    const [conversations, setConversations] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [unreadMessageCount, setUnreadMessageCount] = useState(0);
    const [loading, setLoading] = useState(false);

    const { user } = useContext(AuthContext);
    const API_URL = `${API_BASE_URL}/messages`;

    const getAuthHeader = useCallback(() => ({
        headers: { Authorization: `Bearer ${user?.token}` },
    }), [user?.token]);

    const fetchConversations = useCallback(async () => {
        if (!user?.token) return;
        setLoading(true);
        try {
            const response = await axios.get(`${API_URL}/conversations`, getAuthHeader());
            setConversations(response.data);
        } catch (err) {
            console.log("Failed to fetch conversations:", err);
        } finally {
            setLoading(false);
        }
    }, [API_URL, getAuthHeader, user?.token]);

    const fetchUnreadCount = useCallback(async () => {
        if (!user?.token) return;
        try {
            const response = await axios.get(`${API_URL}/unread-count`, getAuthHeader());
            setUnreadMessageCount(response.data.count);
        } catch (err) {
            console.log("Failed to fetch unread message count:", err);
        }
    }, [API_URL, getAuthHeader, user?.token]);

    const fetchContacts = useCallback(async () => {
        if (!user?.token) return [];
        try {
            const response = await axios.get(`${API_URL}/contacts`, getAuthHeader());
            setContacts(response.data);
            return response.data;
        } catch (err) {
            console.log("Failed to fetch messaging contacts:", err);
            throw err;
        }
    }, [API_URL, getAuthHeader, user?.token]);

    const getMessages = useCallback(async (otherUserId, propertyId) => {
        try {
            const response = await axios.get(
                `${API_URL}/${otherUserId}/${propertyId}`,
                getAuthHeader()
            );
            return response.data;
        } catch (err) {
            console.log("Failed to fetch messages:", err);
            throw err;
        }
    }, [API_URL, getAuthHeader]);

    const sendMessage = useCallback(async (receiverId, propertyId, content, attachment = null) => {
        try {
            let response;

            if (attachment) {
                const formData = new FormData();
                formData.append("receiverId", receiverId);
                formData.append("propertyId", propertyId);
                formData.append("content", content || "");
                formData.append("attachment", {
                    uri: attachment.uri,
                    name: attachment.name,
                    type: attachment.mimeType || attachment.type || "application/octet-stream",
                });

                response = await axios.post(API_URL, formData, {
                    ...getAuthHeader(),
                    headers: {
                        ...getAuthHeader().headers,
                        "Content-Type": "multipart/form-data",
                    },
                });
            } else {
                response = await axios.post(
                    API_URL,
                    { receiverId, propertyId, content },
                    getAuthHeader()
                );
            }

            await Promise.allSettled([fetchConversations(), fetchUnreadCount()]);
            return response.data;
        } catch (err) {
            console.log("Failed to send message:", err);
            throw err;
        }
    }, [API_URL, fetchConversations, fetchUnreadCount, getAuthHeader]);

    const markThreadAsRead = useCallback(async (otherUserId, propertyId) => {
        try {
            await axios.put(
                `${API_URL}/${otherUserId}/${propertyId}/read`,
                {},
                getAuthHeader()
            );
            await Promise.allSettled([fetchConversations(), fetchUnreadCount()]);
        } catch (err) {
            console.log("Failed to mark thread as read:", err);
        }
    }, [API_URL, fetchConversations, fetchUnreadCount, getAuthHeader]);

    return (
        <MessageContext.Provider
            value={{
                conversations,
                contacts,
                unreadMessageCount,
                loading,
                fetchConversations,
                fetchUnreadCount,
                fetchContacts,
                getMessages,
                sendMessage,
                markThreadAsRead,
            }}
        >
            {children}
        </MessageContext.Provider>
    );
};
