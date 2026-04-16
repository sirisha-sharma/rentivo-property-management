import React, { useContext, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { MaintenanceContext } from "../../../context/MaintenanceContext";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TopBar } from "../../../components/TopBar";
import { StatusBadge } from "../../../components/StatusBadge";
import { COLORS } from "../../../constants/theme";

// Landlord Maintenance Request List Screen
// Displays all maintenance requests submitted by tenants for the landlord's properties
export default function MaintenanceList() {
    const { requests, fetchRequests, updateRequestStatus, deleteRequest, loading } = useContext(MaintenanceContext);
    const router = useRouter();
    const [filter, setFilter] = useState("all");

    const getDisplayStatus = (status) => (status === "Pending" ? "Open" : status);

    // Fetch maintenance requests when screen loads
    useEffect(() => {
        fetchRequests();
    }, []);

    // Filter requests based on selected status filter
    const filteredRequests = requests.filter((req) => {
        if (filter === "all") return true;
        return getDisplayStatus(req.status)?.toLowerCase() === filter.toLowerCase();
    });

    // Handle marking a request as "In Progress"
    const handleMarkInProgress = (request) => {
        Alert.alert(
            "Update Status",
            `Mark this request as In Progress?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Confirm",
                    onPress: async () => {
                        try {
                            await updateRequestStatus(request._id, "In Progress");
                        } catch (_e) {
                            Alert.alert("Error", "Failed to update status");
                        }
                    },
                },
            ]
        );
    };

    // Handle marking a request as "Resolved"
    const handleMarkResolved = (request) => {
        Alert.alert(
            "Resolve Request",
            `Mark this maintenance request as Resolved?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Resolve",
                    onPress: async () => {
                        try {
                            await updateRequestStatus(request._id, "Resolved");
                        } catch (_e) {
                            Alert.alert("Error", "Failed to update status");
                        }
                    },
                },
            ]
        );
    };

    // Handle deleting a maintenance request
    const handleDelete = (request) => {
        Alert.alert(
            "Delete Request",
            `Are you sure you want to delete this maintenance request?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteRequest(request._id);
                        } catch (_e) {
                            Alert.alert("Error", "Failed to delete request");
                        }
                    },
                },
            ]
        );
    };

    // Format date string to readable format
    const formatDate = (dateStr) => {
        if (!dateStr) return "N/A";
        return new Date(dateStr).toLocaleDateString();
    };

    // Get color for priority badge
    const getPriorityColor = (priority) => {
        switch (priority) {
            case "High":
                return { bg: "#FEE2E2", text: "#991B1B" };
            case "Medium":
                return { bg: "#FEF9C3", text: "#854D0E" };
            case "Low":
                return { bg: "#DCFCE7", text: "#166534" };
            default:
                return { bg: COLORS.muted, text: COLORS.mutedForeground };
        }
    };

    // Render each maintenance request card
    const renderItem = ({ item }) => {
        const priorityColor = getPriorityColor(item.priority);
        const displayStatus = getDisplayStatus(item.status || "Open");
        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => router.push(`/landlord/maintenance/${item._id}`)}
            >
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>{item.title}</Text>
                        <View style={styles.subtextContainer}>
                            <Ionicons name="home-outline" size={12} color={COLORS.mutedForeground} />
                            <Text style={styles.cardSubtitle}>{item.propertyId?.title || "Unknown Property"}</Text>
                        </View>
                        <View style={styles.subtextContainer}>
                            <Ionicons name="person-outline" size={12} color={COLORS.mutedForeground} />
                            <Text style={styles.cardSubtitle}>
                                {item.tenantId?.userId?.name || "Unknown Tenant"}
                            </Text>
                        </View>
                    </View>
                    <StatusBadge status={displayStatus} />
                </View>

                <View style={styles.divider} />

                <View style={styles.cardFooter}>
                    <View style={styles.footerLeft}>
                        <Text style={styles.dateText}>Submitted: {formatDate(item.createdAt)}</Text>
                        <View style={[styles.priorityBadge, { backgroundColor: priorityColor.bg }]}>
                            <Text style={[styles.priorityText, { color: priorityColor.text }]}>{item.priority}</Text>
                        </View>
                    </View>
                    <View style={styles.actionRow}>
                        {displayStatus === "Open" && (
                            <TouchableOpacity style={styles.progressBtn} onPress={() => handleMarkInProgress(item)}>
                                <Ionicons name="play-circle-outline" size={16} color="#1E40AF" />
                                <Text style={styles.progressBtnText}>Start</Text>
                            </TouchableOpacity>
                        )}
                        {displayStatus === "In Progress" && (
                            <TouchableOpacity style={styles.completeBtn} onPress={() => handleMarkResolved(item)}>
                                <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.success} />
                                <Text style={styles.completeBtnText}>Done</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
                            <Ionicons name="trash-outline" size={16} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <TopBar title="Maintenance Requests" showBack />

            {/* Filter Tabs */}
            <View style={styles.filterRow}>
                {["all", "open", "in progress", "resolved"].map((f) => (
                    <TouchableOpacity
                        key={f}
                        style={[styles.filterChip, filter === f && styles.filterChipActive]}
                        onPress={() => setFilter(f)}
                    >
                        <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={filteredRequests}
                    keyExtractor={(item) => item._id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="construct" size={48} color={COLORS.border} />
                            <Text style={styles.emptyTitle}>No maintenance requests</Text>
                            <Text style={styles.emptyText}>Maintenance requests from tenants will appear here.</Text>
                        </View>
                    }
                    refreshing={loading}
                    onRefresh={fetchRequests}
                />
            )}
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
        backgroundColor: COLORS.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 16,
        marginBottom: 12,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.foreground,
        marginBottom: 2,
    },
    subtextContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 4,
    },
    cardSubtitle: {
        fontSize: 14,
        color: COLORS.mutedForeground,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: 12,
    },
    cardFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    footerLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    dateText: {
        fontSize: 12,
        color: COLORS.mutedForeground,
    },
    priorityBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    priorityText: {
        fontSize: 11,
        fontWeight: "600",
    },
    actionRow: {
        flexDirection: "row",
        gap: 8,
    },
    progressBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: "#DBEAFE",
        borderRadius: 6,
    },
    progressBtnText: {
        fontSize: 12,
        color: "#1E40AF",
        fontWeight: "500",
    },
    completeBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: "#D1FAE5",
        borderRadius: 6,
    },
    completeBtnText: {
        fontSize: 12,
        color: COLORS.success,
        fontWeight: "500",
    },
    deleteBtn: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: "#FEE2E2",
        borderRadius: 6,
    },
    fab: {
        position: "absolute",
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.primary,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
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
    filterRow: {
        flexDirection: "row",
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: COLORS.muted,
    },
    filterChipActive: {
        backgroundColor: COLORS.primary,
    },
    filterText: {
        fontSize: 13,
        fontWeight: "500",
        color: COLORS.mutedForeground,
    },
    filterTextActive: {
        color: "#fff",
    },
});
