import React, { useContext, useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Alert,
    TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { MaintenanceContext } from "../../../context/MaintenanceContext";
import { TopBar } from "../../../components/TopBar";
import { StatusBadge } from "../../../components/StatusBadge";
import { COLORS } from "../../../constants/theme";

// Landlord Maintenance Request Detail Screen
// Shows full details of a maintenance request and allows status updates
export default function MaintenanceDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { getRequestById, updateRequestStatus, deleteRequest, loading } = useContext(MaintenanceContext);
    const [request, setRequest] = useState(null);
    const [pageLoading, setPageLoading] = useState(true);

    // Fetch request details when screen loads
    useEffect(() => {
        loadRequest();
    }, [id]);

    const loadRequest = async () => {
        try {
            const data = await getRequestById(id);
            setRequest(data);
        } catch (err) {
            Alert.alert("Error", "Failed to load maintenance request");
            router.back();
        } finally {
            setPageLoading(false);
        }
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

    // Handle updating request status
    const handleStatusUpdate = (newStatus) => {
        Alert.alert(
            "Update Status",
            `Change status to "${newStatus}"?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Confirm",
                    onPress: async () => {
                        try {
                            const updated = await updateRequestStatus(id, newStatus);
                            setRequest(updated);
                        } catch (e) {
                            Alert.alert("Error", "Failed to update status");
                        }
                    },
                },
            ]
        );
    };

    // Handle deleting the request
    const handleDelete = () => {
        Alert.alert(
            "Delete Request",
            "Are you sure you want to delete this maintenance request?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteRequest(id);
                            router.back();
                        } catch (e) {
                            Alert.alert("Error", "Failed to delete request");
                        }
                    },
                },
            ]
        );
    };

    if (pageLoading) {
        return (
            <View style={styles.container}>
                <TopBar title="Request Details" showBack />
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
            </View>
        );
    }

    if (!request) return null;

    const priorityColor = getPriorityColor(request.priority);

    return (
        <View style={styles.container}>
            <TopBar title="Request Details" showBack />

            <ScrollView contentContainerStyle={styles.content}>
                {/* Status and Priority Header */}
                <View style={styles.headerRow}>
                    <StatusBadge status={request.status || "Pending"} />
                    <View style={[styles.priorityBadge, { backgroundColor: priorityColor.bg }]}>
                        <Text style={[styles.priorityText, { color: priorityColor.text }]}>
                            {request.priority} Priority
                        </Text>
                    </View>
                </View>

                {/* Title */}
                <Text style={styles.title}>{request.title}</Text>

                {/* Description */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Description</Text>
                    <Text style={styles.description}>{request.description || "No description provided"}</Text>
                </View>

                {/* Details Card */}
                <View style={styles.detailCard}>
                    <View style={styles.detailRow}>
                        <View style={styles.detailItem}>
                            <Ionicons name="home-outline" size={16} color={COLORS.mutedForeground} />
                            <View>
                                <Text style={styles.detailLabel}>Property</Text>
                                <Text style={styles.detailValue}>{request.propertyId?.title || "N/A"}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.detailDivider} />

                    <View style={styles.detailRow}>
                        <View style={styles.detailItem}>
                            <Ionicons name="person-outline" size={16} color={COLORS.mutedForeground} />
                            <View>
                                <Text style={styles.detailLabel}>Submitted By</Text>
                                <Text style={styles.detailValue}>
                                    {request.tenantId?.userId?.name || "Unknown Tenant"}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.detailDivider} />

                    <View style={styles.detailRow}>
                        <View style={styles.detailItem}>
                            <Ionicons name="calendar-outline" size={16} color={COLORS.mutedForeground} />
                            <View>
                                <Text style={styles.detailLabel}>Submitted On</Text>
                                <Text style={styles.detailValue}>{formatDate(request.createdAt)}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionSection}>
                    {request.status === "Pending" && (
                        <TouchableOpacity
                            style={styles.inProgressBtn}
                            onPress={() => handleStatusUpdate("In Progress")}
                        >
                            <Ionicons name="play-circle-outline" size={20} color="#fff" />
                            <Text style={styles.actionBtnText}>Mark as In Progress</Text>
                        </TouchableOpacity>
                    )}

                    {request.status === "In Progress" && (
                        <TouchableOpacity
                            style={styles.completedBtn}
                            onPress={() => handleStatusUpdate("Resolved")}
                        >
                            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                            <Text style={styles.actionBtnText}>Mark as Resolved</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity style={styles.deleteBtnLarge} onPress={handleDelete}>
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                        <Text style={styles.deleteBtnText}>Delete Request</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        padding: 20,
    },
    headerRow: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: "700",
        color: COLORS.foreground,
        marginBottom: 20,
    },
    section: {
        marginBottom: 20,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.mutedForeground,
        marginBottom: 6,
    },
    description: {
        fontSize: 15,
        color: COLORS.foreground,
        lineHeight: 22,
    },
    detailCard: {
        backgroundColor: COLORS.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 16,
        marginBottom: 24,
    },
    detailRow: {
        paddingVertical: 8,
    },
    detailItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    detailLabel: {
        fontSize: 12,
        color: COLORS.mutedForeground,
    },
    detailValue: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.foreground,
    },
    detailDivider: {
        height: 1,
        backgroundColor: COLORS.border,
    },
    priorityBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    priorityText: {
        fontSize: 12,
        fontWeight: "600",
    },
    actionSection: {
        gap: 12,
    },
    inProgressBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: "#2563EB",
        paddingVertical: 16,
        borderRadius: 12,
    },
    completedBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: COLORS.success,
        paddingVertical: 16,
        borderRadius: 12,
    },
    actionBtnText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#fff",
    },
    deleteBtnLarge: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: "#FEE2E2",
        paddingVertical: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#EF4444",
    },
    deleteBtnText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#EF4444",
    },
});
