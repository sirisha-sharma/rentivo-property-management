import React, { useContext, useEffect, useRef, useState, useCallback } from "react";
import {
    View,
    Text,
    FlatList,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Alert,
    Linking,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { MessageContext } from "../../context/MessageContext";
import { AuthContext } from "../../context/AuthContext";
import { TopBar } from "../../components/TopBar";
import { COLORS } from "../../constants/theme";

// Message Thread Screen
// Shows the chat between the current user and another user for a specific property
export default function MessageThreadScreen() {
    const params = useLocalSearchParams();
    const { threadId, name, property } = params;

    // Parse receiverId and propertyId from threadId (format: "receiverId_propertyId")
    // ObjectIds are 24-char hex strings with no underscores, so this split is unambiguous
    const [receiverId, propertyId] = threadId ? threadId.split("_") : [null, null];

    const { user } = useContext(AuthContext);
    const { getMessages, sendMessage, markThreadAsRead, fetchConversations } = useContext(MessageContext);

    const [messages, setMessages] = useState([]);
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [attachment, setAttachment] = useState(null);
    const flatListRef = useRef(null);

    const mergeUniqueMessages = useCallback((incomingMessages) => {
        const seen = new Map();

        incomingMessages.forEach((message) => {
            if (!message?._id) return;
            seen.set(message._id, message);
        });

        return Array.from(seen.values()).sort(
            (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );
    }, []);

    const loadMessages = useCallback(async () => {
        if (!receiverId || !propertyId) {
            setLoading(false);
            return;
        }
        try {
            const data = await getMessages(receiverId, propertyId);
            setMessages((prev) => mergeUniqueMessages([...prev, ...data]));
            // Mark incoming messages as read
            await markThreadAsRead(receiverId, propertyId);
        } catch (err) {
            Alert.alert("Error", err?.response?.data?.message || "Failed to load messages");
        } finally {
            setLoading(false);
        }
    }, [getMessages, markThreadAsRead, mergeUniqueMessages, receiverId, propertyId]);

    useFocusEffect(
        useCallback(() => {
            loadMessages();
            // Poll for new messages every 5 seconds while screen is focused
            const interval = setInterval(loadMessages, 5000);
            return () => clearInterval(interval);
        }, [loadMessages])
    );

    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
    }, [messages.length]);

    const handleSend = async () => {
        const trimmed = content.trim();
        if ((!trimmed && !attachment) || sending) return;

        setSending(true);
        try {
            const newMsg = await sendMessage(receiverId, propertyId, trimmed, attachment);
            setContent("");
            setAttachment(null);
            setMessages((prev) => mergeUniqueMessages([...prev, newMsg]));
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
            fetchConversations();
        } catch (err) {
            Alert.alert("Error", err?.response?.data?.message || "Failed to send message");
        } finally {
            setSending(false);
        }
    };

    const handlePickAttachment = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                copyToCacheDirectory: true,
                multiple: false,
                type: [
                    "application/pdf",
                    "image/*",
                    "application/msword",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ],
            });

            if (result.canceled || !result.assets?.length) {
                return;
            }

            setAttachment(result.assets[0]);
        } catch (_error) {
            Alert.alert("Error", "Failed to pick attachment");
        }
    };

    const openAttachment = async (fileUrl) => {
        if (!fileUrl) return;

        const supported = await Linking.canOpenURL(fileUrl);
        if (!supported) {
            Alert.alert("Error", "This attachment cannot be opened on your device.");
            return;
        }

        await Linking.openURL(fileUrl);
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return "";
        return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    const formatDateHeader = (dateStr) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        if (date.toDateString() === today.toDateString()) return "Today";
        if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
        return date.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });
    };

    const renderItem = ({ item, index }) => {
        const isMe = item.senderId?._id?.toString() === user?._id?.toString()
            || item.senderId?.toString() === user?._id?.toString();

        // Show date header when date changes between messages
        const prevMsg = messages[index - 1];
        const showDateHeader = !prevMsg
            || new Date(item.createdAt).toDateString() !== new Date(prevMsg.createdAt).toDateString();

        return (
            <>
                {showDateHeader && (
                    <View style={styles.dateHeader}>
                        <Text style={styles.dateHeaderText}>{formatDateHeader(item.createdAt)}</Text>
                    </View>
                )}
                <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowThem]}>
                    <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                        {item.content ? (
                            <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>
                                {item.content}
                            </Text>
                        ) : null}
                        {item.attachment?.fileUrl ? (
                            <TouchableOpacity
                                style={[styles.attachmentCard, isMe ? styles.attachmentCardMe : styles.attachmentCardThem]}
                                onPress={() => void openAttachment(item.attachment.fileUrl)}
                            >
                                <Ionicons
                                    name="attach-outline"
                                    size={16}
                                    color={isMe ? "#fff" : COLORS.primary}
                                />
                                <Text
                                    style={[styles.attachmentText, isMe ? styles.attachmentTextMe : styles.attachmentTextThem]}
                                    numberOfLines={1}
                                >
                                    {item.attachment.originalName || "Open attachment"}
                                </Text>
                            </TouchableOpacity>
                        ) : null}
                        <Text style={[styles.msgTime, isMe ? styles.msgTimeMe : styles.msgTimeThem]}>
                            {formatTime(item.createdAt)}
                        </Text>
                    </View>
                </View>
            </>
        );
    };

    return (
        <View style={styles.container}>
            <TopBar title={name ? `${name}` : "Chat"} showBack />
            {property ? (
                <View style={styles.propertyBar}>
                    <Ionicons name="home-outline" size={14} color={COLORS.mutedForeground} />
                    <Text style={styles.propertyBarText} numberOfLines={1}>{property}</Text>
                </View>
            ) : null}

            {loading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
            ) : (
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
                >
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        keyExtractor={(item) => item._id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.messageList}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons name="chatbubble-outline" size={48} color={COLORS.border} />
                                <Text style={styles.emptyText}>No messages yet. Say hello!</Text>
                            </View>
                        }
                        onContentSizeChange={() =>
                            flatListRef.current?.scrollToEnd({ animated: false })
                        }
                    />

                    {/* Input Bar */}
                    {attachment ? (
                        <View style={styles.attachmentPreview}>
                            <View style={styles.attachmentPreviewLeft}>
                                <Ionicons name="document-attach-outline" size={18} color={COLORS.primary} />
                                <Text style={styles.attachmentPreviewText} numberOfLines={1}>
                                    {attachment.name}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setAttachment(null)}>
                                <Ionicons name="close-circle" size={20} color={COLORS.mutedForeground} />
                            </TouchableOpacity>
                        </View>
                    ) : null}
                    <View style={styles.inputBar}>
                        <TouchableOpacity
                            style={styles.attachBtn}
                            onPress={handlePickAttachment}
                        >
                            <Ionicons name="attach" size={20} color={COLORS.primary} />
                        </TouchableOpacity>
                        <TextInput
                            style={styles.input}
                            placeholder="Type a message..."
                            placeholderTextColor={COLORS.mutedForeground}
                            value={content}
                            onChangeText={setContent}
                            multiline
                            maxLength={500}
                            returnKeyType="default"
                        />
                        <TouchableOpacity
                            style={[styles.sendBtn, (!content.trim() && !attachment || sending) && styles.sendBtnDisabled]}
                            onPress={handleSend}
                            disabled={(!content.trim() && !attachment) || sending}
                        >
                            {sending ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Ionicons name="send" size={20} color="#fff" />
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    messageList: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexGrow: 1,
    },
    dateHeader: {
        alignItems: "center",
        marginVertical: 10,
    },
    dateHeaderText: {
        fontSize: 12,
        color: COLORS.mutedForeground,
        backgroundColor: COLORS.muted,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 10,
    },
    msgRow: {
        marginBottom: 6,
        flexDirection: "row",
    },
    msgRowMe: {
        justifyContent: "flex-end",
    },
    msgRowThem: {
        justifyContent: "flex-start",
    },
    bubble: {
        maxWidth: "75%",
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    bubbleMe: {
        backgroundColor: COLORS.primary,
        borderBottomRightRadius: 4,
    },
    bubbleThem: {
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderBottomLeftRadius: 4,
    },
    bubbleText: {
        fontSize: 15,
        lineHeight: 22,
    },
    bubbleTextMe: {
        color: "#fff",
    },
    bubbleTextThem: {
        color: COLORS.foreground,
    },
    msgTime: {
        fontSize: 10,
        marginTop: 4,
    },
    msgTimeMe: {
        color: "rgba(255,255,255,0.7)",
        textAlign: "right",
    },
    msgTimeThem: {
        color: COLORS.mutedForeground,
    },
    emptyContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 60,
    },
    emptyText: {
        marginTop: 12,
        color: COLORS.mutedForeground,
        fontSize: 14,
    },
    inputBar: {
        flexDirection: "row",
        alignItems: "flex-end",
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: COLORS.card,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    attachBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.background,
    },
    input: {
        flex: 1,
        minHeight: 44,
        maxHeight: 120,
        backgroundColor: COLORS.background,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 15,
        color: COLORS.foreground,
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.primary,
        alignItems: "center",
        justifyContent: "center",
    },
    sendBtnDisabled: {
        backgroundColor: COLORS.muted,
    },
    propertyBar: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 6,
        backgroundColor: COLORS.muted,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    propertyBarText: {
        fontSize: 12,
        color: COLORS.mutedForeground,
        flex: 1,
    },
    attachmentCard: {
        marginTop: 8,
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 8,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    attachmentCardMe: {
        backgroundColor: "rgba(255,255,255,0.18)",
    },
    attachmentCardThem: {
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    attachmentText: {
        flex: 1,
        fontSize: 13,
        fontWeight: "600",
    },
    attachmentTextMe: {
        color: "#fff",
    },
    attachmentTextThem: {
        color: COLORS.primary,
    },
    attachmentPreview: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginHorizontal: 16,
        marginBottom: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.card,
    },
    attachmentPreviewLeft: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    attachmentPreviewText: {
        flex: 1,
        color: COLORS.foreground,
        fontSize: 13,
        fontWeight: "500",
    },
});
