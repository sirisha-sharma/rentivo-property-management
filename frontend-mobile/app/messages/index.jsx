import React, { useContext, useCallback } from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { MessageContext } from "../../context/MessageContext";
import { TopBar } from "../../components/TopBar";
import { COLORS } from "../../constants/theme";

// Messages — Conversations List Screen
// Shows all conversation threads for the current user
export default function ConversationsScreen() {
    const router = useRouter();
    const { conversations, loading, fetchConversations } = useContext(MessageContext);

    useFocusEffect(
        useCallback(() => {
            fetchConversations();
        }, [fetchConversations])
    );

    const formatTime = (dateStr) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        if (diffDays === 1) return "Yesterday";
        if (diffDays < 7) return date.toLocaleDateString([], { weekday: "short" });
        return date.toLocaleDateString([], { month: "short", day: "numeric" });
    };

    const renderItem = ({ item }) => {
        const threadId = `${item.otherUserId}_${item.propertyId}`;
        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => router.push(`/messages/${threadId}?name=${encodeURIComponent(item.otherUserName)}&property=${encodeURIComponent(item.propertyTitle || "")}`)}
            >
                {/* Avatar */}
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {item.otherUserName?.charAt(0)?.toUpperCase() || "?"}
                    </Text>
                </View>

                {/* Content */}
                <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.userName} numberOfLines={1}>{item.otherUserName}</Text>
                        <Text style={styles.time}>{formatTime(item.lastMessageAt)}</Text>
                    </View>
                    <Text style={styles.propertyTag} numberOfLines={1}>
                        {item.propertyTitle || "Property"}
                    </Text>
                    <Text
                        style={[styles.lastMessage, item.unreadCount > 0 && styles.lastMessageUnread]}
                        numberOfLines={1}
                    >
                        {item.lastMessage}
                    </Text>
                </View>

                {/* Unread badge */}
                {item.unreadCount > 0 && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                            {item.unreadCount > 9 ? "9+" : item.unreadCount}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <TopBar title="Messages" showBack />

            {loading && conversations.length === 0 ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={conversations}
                    keyExtractor={(item) => `${item.otherUserId}_${item.propertyId}`}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    refreshing={loading}
                    onRefresh={fetchConversations}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="chatbubbles-outline" size={56} color={COLORS.border} />
                            <Text style={styles.emptyTitle}>No messages yet</Text>
                            <Text style={styles.emptyText}>
                                Start a conversation with your landlord or tenants from here.
                            </Text>
                            <TouchableOpacity
                                style={styles.emptyButton}
                                onPress={() => router.push("/messages/new")}
                            >
                                <Ionicons name="add" size={18} color="#fff" />
                                <Text style={styles.emptyButtonText}>Start New Chat</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}

            <TouchableOpacity
                style={styles.fab}
                onPress={() => router.push("/messages/new")}
            >
                <Ionicons name="create-outline" size={22} color="#fff" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    list: {
        padding: 16,
    },
    card: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 14,
        marginBottom: 10,
        gap: 12,
    },
    avatar: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: COLORS.primary,
        alignItems: "center",
        justifyContent: "center",
    },
    avatarText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "700",
    },
    cardContent: {
        flex: 1,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 2,
    },
    userName: {
        fontSize: 15,
        fontWeight: "700",
        color: COLORS.foreground,
        flex: 1,
        marginRight: 8,
    },
    time: {
        fontSize: 11,
        color: COLORS.mutedForeground,
    },
    propertyTag: {
        fontSize: 11,
        color: COLORS.primary,
        marginBottom: 3,
        fontWeight: "500",
    },
    lastMessage: {
        fontSize: 13,
        color: COLORS.mutedForeground,
    },
    lastMessageUnread: {
        color: COLORS.foreground,
        fontWeight: "600",
    },
    badge: {
        backgroundColor: COLORS.primary,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 5,
    },
    badgeText: {
        color: "#fff",
        fontSize: 11,
        fontWeight: "700",
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 80,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: COLORS.foreground,
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        textAlign: "center",
        color: COLORS.mutedForeground,
        paddingHorizontal: 40,
        lineHeight: 20,
    },
    emptyButton: {
        marginTop: 18,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: COLORS.primary,
        borderRadius: 999,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    emptyButtonText: {
        color: "#fff",
        fontWeight: "600",
    },
    fab: {
        position: "absolute",
        right: 20,
        bottom: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.primary,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 4,
    },
});
