import React, { useContext, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { NotificationContext } from "../context/NotificationContext";
import { Ionicons } from "@expo/vector-icons";
import { TopBar } from "../components/TopBar";
import { COLORS } from "../constants/theme";

export default function NotificationsScreen() {
    const { notifications, loading, fetchNotifications, markAsRead, markAllAsRead, deleteNotification } =
        useContext(NotificationContext);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const getIcon = (type) => {
        switch (type) {
            case "maintenance":
                return { name: "construct-outline", color: COLORS.warning };
            case "invoice":
                return { name: "receipt-outline", color: "#9333EA" };
            case "tenant":
                return { name: "person-add-outline", color: COLORS.success };
            case "document":
                return { name: "folder-open-outline", color: "#0D9488" };
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
                    <View style={styles.emptyContainer}>
                        <Ionicons name="notifications-off-outline" size={48} color={COLORS.border} />
                        <Text style={styles.emptyTitle}>No notifications</Text>
                        <Text style={styles.emptyText}>You're all caught up!</Text>
                    </View>
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
        backgroundColor: "#EFF6FF",
        borderColor: "#BFDBFE",
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
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 60,
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
    },
});
