import React, { useContext } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { NotificationContext } from "../context/NotificationContext";
import { Ionicons } from "@expo/vector-icons";
import { TopBar } from "../components/TopBar";
import { EmptyState } from "../components/EmptyState";
import { COLORS } from "../constants/theme";
import { useFocusEffect } from "@react-navigation/native";

// Screen module for notifications.

export default function NotificationsScreen() {
    const { notifications, loading, fetchNotifications, markAsRead, markAllAsRead, deleteNotification } =
        useContext(NotificationContext);

    useFocusEffect(
        React.useCallback(() => {
            void fetchNotifications();
        }, [fetchNotifications])
    );

    const getIcon = (type) => {
        switch (type) {
            case "maintenance":
                return { name: "construct-outline", color: COLORS.warning };
            case "invoice":
                return { name: "receipt-outline", color: COLORS.accentLilac };
            case "tenant":
                return { name: "person-add-outline", color: COLORS.success };
            case "document":
                return { name: "folder-open-outline", color: COLORS.accentTealBright };
            case "payment":
                return { name: "card-outline", color: COLORS.primary };
            case "subscription":
                return { name: "ribbon-outline", color: COLORS.accentTealBright };
            default:
                return { name: "notifications-outline", color: COLORS.primary };
        }
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return "";
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "Just now";
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return `${days}d ago`;
    };

    const handleDelete = (item) => {
        Alert.alert("Delete", "Remove this notification?", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => deleteNotification(item._id) },
        ]);
    };

    const renderItem = ({ item }) => {
        const icon = getIcon(item.type);
        return (
            <TouchableOpacity
                style={[styles.card, !item.read && styles.unreadCard]}
                onPress={() => markAsRead(item._id)}
                onLongPress={() => handleDelete(item)}
            >
                <View style={[styles.iconCircle, { backgroundColor: icon.color + "20" }]}>
                    <Ionicons name={icon.name} size={20} color={icon.color} />
                </View>
                <View style={styles.cardContent}>
                    <Text style={[styles.message, !item.read && styles.unreadMessage]}>
                        {item.message}
                    </Text>
                    <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
                </View>
                {!item.read && <View style={styles.dot} />}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <TopBar
                title="Notifications"
                showBack
                rightIcon={notifications.length > 0 ? "checkmark-done-outline" : undefined}
                onRightPress={markAllAsRead}
            />

            <FlatList
                data={notifications}
                keyExtractor={(item) => item._id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <EmptyState
                        icon="notifications-off-outline"
                        title="No notifications"
                        subtitle="You're all caught up!"
                    />
                }
                refreshing={loading}
                onRefresh={fetchNotifications}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    listContent: {
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
    unreadCard: {
        backgroundColor: COLORS.primarySoft,
        borderColor: "rgba(47,123,255,0.3)",
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    cardContent: {
        flex: 1,
    },
    message: {
        fontSize: 14,
        color: COLORS.foreground,
        lineHeight: 20,
    },
    unreadMessage: {
        fontWeight: "600",
    },
    time: {
        fontSize: 12,
        color: COLORS.mutedForeground,
        marginTop: 4,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.primary,
    },
});
