import React, { useContext, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { MaintenanceContext } from "../../../context/MaintenanceContext";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TopBar } from "../../../components/TopBar";
import { StatusBadge } from "../../../components/StatusBadge";
import { FilterChips } from "../../../components/FilterChips";
import { EmptyState } from "../../../components/EmptyState";
import { COLORS } from "../../../constants/theme";

const FILTERS = [
    { key: "all", label: "All" },
    { key: "open", label: "Open" },
    { key: "in progress", label: "In Progress" },
    { key: "resolved", label: "Resolved" },
];

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
    }, [fetchRequests]);

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
                return { bg: COLORS.destructiveSoft, text: COLORS.destructive };
            case "Medium":
                return { bg: COLORS.warningSoft, text: COLORS.warning };
            case "Low":
                return { bg: COLORS.successSoft, text: COLORS.success };
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
                    <View style={styles.footerMetaRow}>
                        <Text style={styles.dateText}>Submitted: {formatDate(item.createdAt)}</Text>
                        <View style={[styles.priorityBadge, { backgroundColor: priorityColor.bg }]}>
                            <Text style={[styles.priorityText, { color: priorityColor.text }]}>{item.priority}</Text>
                        </View>
                    </View>
                    <View style={styles.actionRow}>
                        {displayStatus === "Open" && (
                            <TouchableOpacity style={styles.progressBtn} onPress={() => handleMarkInProgress(item)}>
                                <Ionicons name="play-circle-outline" size={16} color={COLORS.primary} />
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
                            <Ionicons name="trash-outline" size={16} color={COLORS.destructive} />
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderHeader = () => (
        <View style={styles.listHeader}>
            <FilterChips
                options={FILTERS}
                selected={filter}
                onSelect={setFilter}
                contentContainerStyle={{ paddingHorizontal: 0 }}
            />
        </View>
    );

    return (
        <View style={styles.container}>
            <TopBar title="Maintenance Requests" showBack />

            {loading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    style={{ flex: 1 }}
                    data={filteredRequests}
                    keyExtractor={(item) => item._id}
                    renderItem={renderItem}
                    ListHeaderComponent={renderHeader}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <EmptyState
                            icon="construct-outline"
                            title="No maintenance requests"
                            subtitle="Maintenance requests from tenants will appear here."
                        />
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
        paddingHorizontal: 16,
        paddingBottom: 120,
    },
    listHeader: {
        paddingTop: 12,
        paddingBottom: 8,
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
        gap: 12,
    },
    footerMetaRow: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
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
        flexWrap: "wrap",
        gap: 8,
    },
    progressBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: COLORS.primarySoft,
        borderRadius: 8,
    },
    progressBtnText: {
        fontSize: 12,
        color: COLORS.primary,
        fontWeight: "500",
    },
    completeBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: COLORS.successSoft,
        borderRadius: 8,
    },
    completeBtnText: {
        fontSize: 12,
        color: COLORS.success,
        fontWeight: "500",
    },
    deleteBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: COLORS.destructiveSoft,
        borderRadius: 8,
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
});
