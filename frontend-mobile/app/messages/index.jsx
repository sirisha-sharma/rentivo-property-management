import React, { useContext, useCallback, useMemo } from "react";
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
import { EmptyState } from "../../components/EmptyState";
import { COLORS } from "../../constants/theme";

function SummaryPill({ icon, label, value }) {
    return (
        <View style={styles.summaryPill}>
            <Ionicons name={icon} size={16} color={COLORS.primary} />
            <View>
                <Text style={styles.summaryValue}>{value}</Text>
                <Text style={styles.summaryLabel}>{label}</Text>
            </View>
        </View>
    );
}

export default function ConversationsScreen() {
    const router = useRouter();
    const { conversations, loading, fetchConversations } = useContext(MessageContext);

    useFocusEffect(
        useCallback(() => {
            void fetchConversations();
        }, [fetchConversations])
    );

    const unreadTotal = useMemo(
        () => conversations.reduce((sum, convo) => sum + (convo.unreadCount || 0), 0),
        [conversations]
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
        const hasUnread = item.unreadCount > 0;

        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.86}
                onPress={() =>
                    router.push(
                        `/messages/${threadId}?name=${encodeURIComponent(item.otherUserName)}&property=${encodeURIComponent(item.propertyTitle || "")}`
                    )
                }
            >
                <View style={styles.avatarWrap}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {item.otherUserName?.charAt(0)?.toUpperCase() || "?"}
                        </Text>
                    </View>
                    {hasUnread ? <View style={styles.avatarUnreadDot} /> : null}
                </View>

                <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.userName} numberOfLines={1}>
                            {item.otherUserName}
                        </Text>
                        <Text style={styles.time}>{formatTime(item.lastMessageAt)}</Text>
                    </View>

                    <View style={styles.propertyPill}>
                        <Ionicons name="home-outline" size={12} color={COLORS.primary} />
                        <Text style={styles.propertyText} numberOfLines={1}>
                            {item.propertyTitle || "Property"}
                        </Text>
                    </View>

                    <Text
                        style={[styles.lastMessage, hasUnread && styles.lastMessageUnread]}
                        numberOfLines={1}
                    >
                        {item.lastMessage || "Open the conversation to start chatting."}
                    </Text>
                </View>

                {hasUnread ? (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                            {item.unreadCount > 9 ? "9+" : item.unreadCount}
                        </Text>
                    </View>
                ) : (
                    <Ionicons name="chevron-forward" size={18} color={COLORS.faintForeground} />
                )}
            </TouchableOpacity>
        );
    };

    const listHeader = (
        <View style={styles.headerContent}>
            <View style={styles.heroCard}>
                <View style={styles.heroIcon}>
                    <Ionicons name="chatbubbles-outline" size={24} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.heroTitle}>Stay connected</Text>
                    <Text style={styles.heroSubtitle}>
                        Track tenant and landlord conversations in one premium inbox.
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.heroAction}
                    onPress={() => router.push("/messages/new")}
                >
                    <Ionicons name="add" size={18} color="#fff" />
                </TouchableOpacity>
            </View>

            <View style={styles.summaryRow}>
                <SummaryPill icon="mail-unread-outline" label="Unread" value={unreadTotal} />
                <SummaryPill icon="people-outline" label="Threads" value={conversations.length} />
            </View>
        </View>
    );

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
                    ListHeaderComponent={listHeader}
                    ListEmptyComponent={
                        <EmptyState
                            icon="chatbubbles-outline"
                            title="No messages yet"
                            subtitle="Start a conversation with your landlord or tenants from here."
                            action={{
                                label: "Start New Chat",
                                onPress: () => router.push("/messages/new"),
                            }}
                        />
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
        paddingBottom: 120,
    },
    headerContent: {
        gap: 14,
        marginBottom: 16,
    },
    heroCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        backgroundColor: COLORS.surface,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 18,
    },
    heroIcon: {
        width: 52,
        height: 52,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.primarySoft,
        borderWidth: 1,
        borderColor: "rgba(47,123,255,0.24)",
    },
    heroTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: COLORS.foreground,
        letterSpacing: -0.3,
    },
    heroSubtitle: {
        marginTop: 4,
        fontSize: 13,
        lineHeight: 19,
        color: COLORS.mutedForeground,
    },
    heroAction: {
        width: 42,
        height: 42,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.primary,
    },
    summaryRow: {
        flexDirection: "row",
        gap: 12,
    },
    summaryPill: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: COLORS.surfaceElevated,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: "800",
        color: COLORS.foreground,
    },
    summaryLabel: {
        fontSize: 12,
        color: COLORS.mutedForeground,
    },
    card: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.surface,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 14,
        marginBottom: 12,
        gap: 12,
    },
    avatarWrap: {
        position: "relative",
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 18,
        backgroundColor: COLORS.primarySoft,
        borderWidth: 1,
        borderColor: "rgba(47,123,255,0.24)",
        alignItems: "center",
        justifyContent: "center",
    },
    avatarText: {
        color: COLORS.primary,
        fontSize: 18,
        fontWeight: "800",
    },
    avatarUnreadDot: {
        position: "absolute",
        top: -2,
        right: -2,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: COLORS.destructive,
        borderWidth: 2,
        borderColor: COLORS.background,
    },
    cardContent: {
        flex: 1,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
        marginBottom: 8,
    },
    userName: {
        flex: 1,
        fontSize: 15,
        fontWeight: "700",
        color: COLORS.foreground,
    },
    time: {
        fontSize: 11,
        color: COLORS.faintForeground,
    },
    propertyPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        alignSelf: "flex-start",
        backgroundColor: COLORS.primarySoft,
        borderWidth: 1,
        borderColor: "rgba(47,123,255,0.16)",
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
        marginBottom: 8,
    },
    propertyText: {
        maxWidth: 180,
        fontSize: 12,
        color: COLORS.primary,
        fontWeight: "600",
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
        minWidth: 24,
        height: 24,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 6,
        backgroundColor: COLORS.primary,
    },
    badgeText: {
        color: "#fff",
        fontSize: 11,
        fontWeight: "800",
    },
    fab: {
        position: "absolute",
        right: 20,
        bottom: 24,
        width: 58,
        height: 58,
        borderRadius: 19,
        backgroundColor: COLORS.primary,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.32,
        shadowRadius: 18,
        elevation: 6,
    },
});
