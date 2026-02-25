import React, { useContext, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { MaintenanceContext } from "../../../context/MaintenanceContext";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TopBar } from "../../../components/TopBar";
import { StatusBadge } from "../../../components/StatusBadge";
import { COLORS } from "../../../constants/theme";

// Tenant Maintenance Request List Screen
// Displays all maintenance requests submitted by the tenant
export default function TenantMaintenance() {
    const { requests, fetchRequests, loading } = useContext(MaintenanceContext);
    const router = useRouter();
    const [filter, setFilter] = useState("all");

    // Fetch maintenance requests when screen loads
    useEffect(() => {
        fetchRequests();
    }, []);

    // Filter requests based on selected status filter
    const filteredRequests = requests.filter((req) => {
        if (filter === "all") return true;
        return req.status?.toLowerCase() === filter.toLowerCase();
    });

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
        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => router.push(`/tenant/maintenance/${item._id}`)}
            >
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>{item.title}</Text>
                        <View style={styles.subtextContainer}>
                            <Ionicons name="home-outline" size={12} color={COLORS.mutedForeground} />
                            <Text style={styles.cardSubtitle}>{item.propertyId?.title || "Unknown Property"}</Text>
                        </View>
                    </View>
                    <StatusBadge status={item.status || "Pending"} />
                </View>

                <View style={styles.divider} />

                <View style={styles.cardFooter}>
                    <Text style={styles.dateText}>Submitted: {formatDate(item.createdAt)}</Text>
                    <View style={[styles.priorityBadge, { backgroundColor: priorityColor.bg }]}>
                        <Text style={[styles.priorityText, { color: priorityColor.text }]}>{item.priority}</Text>
                    </View>
                </View>

                {item.description && (
                    <Text style={styles.descriptionText} numberOfLines={2}>
                        {item.description}
                    </Text>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <TopBar title="My Maintenance Requests" showBack />

            {/* Filter Tabs */}
            <View style={styles.filterRow}>
                {["all", "pending", "in progress", "completed"].map((f) => (
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
                            <Text style={styles.emptyText}>Submit a request when you need something fixed.</Text>
                        </View>
                    }
                    refreshing={loading}
                    onRefresh={fetchRequests}
                />
            )}

            {/* Floating Action Button to create new request */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => router.push("/tenant/maintenance/create")}
            >
                <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
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
    descriptionText: {
        fontSize: 13,
        color: COLORS.mutedForeground,
        marginTop: 8,
        fontStyle: "italic",
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
