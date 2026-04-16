import React, { useContext, useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { MaintenanceContext } from "../../../context/MaintenanceContext";
import { TopBar } from "../../../components/TopBar";
import { StatusBadge } from "../../../components/StatusBadge";
import { COLORS } from "../../../constants/theme";

// Tenant Maintenance Request Detail Screen
// Shows full details of a maintenance request submitted by the tenant
export default function TenantMaintenanceDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { getRequestById } = useContext(MaintenanceContext);
    const [request, setRequest] = useState(null);
    const [pageLoading, setPageLoading] = useState(true);

    const getDisplayStatus = (status) => (status === "Pending" ? "Open" : status);

    // Fetch request details when screen loads
    useEffect(() => {
        loadRequest();
    }, [id]);

    const loadRequest = async () => {
        try {
            const data = await getRequestById(id);
            setRequest(data);
        } catch (_err) {
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
    const displayStatus = getDisplayStatus(request.status || "Open");

    return (
        <View style={styles.container}>
            <TopBar title="Request Details" showBack />

            <ScrollView contentContainerStyle={styles.content}>
                {/* Status and Priority Header */}
                <View style={styles.headerRow}>
                    <StatusBadge status={displayStatus} />
                    <View style={[styles.priorityBadge, { backgroundColor: priorityColor.bg }]}>
                        <Text style={[styles.priorityText, { color: priorityColor.text }]}>
                            {request.priority} Urgency
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
                            <Ionicons name="calendar-outline" size={16} color={COLORS.mutedForeground} />
                            <View>
                                <Text style={styles.detailLabel}>Submitted On</Text>
                                <Text style={styles.detailValue}>{formatDate(request.createdAt)}</Text>
                            </View>
                        </View>
                    </View>

                    {request.updatedAt && request.updatedAt !== request.createdAt && (
                        <>
                            <View style={styles.detailDivider} />
                            <View style={styles.detailRow}>
                                <View style={styles.detailItem}>
                                    <Ionicons name="time-outline" size={16} color={COLORS.mutedForeground} />
                                    <View>
                                        <Text style={styles.detailLabel}>Last Updated</Text>
                                        <Text style={styles.detailValue}>{formatDate(request.updatedAt)}</Text>
                                    </View>
                                </View>
                            </View>
                        </>
                    )}
                </View>

                {/* Status Info */}
                {displayStatus === "Open" && (
                    <View style={styles.infoBox}>
                        <Ionicons name="information-circle-outline" size={20} color="#854D0E" />
                        <Text style={styles.infoText}>Your request is open. The landlord will review it soon.</Text>
                    </View>
                )}

                {displayStatus === "In Progress" && (
                    <View style={[styles.infoBox, { backgroundColor: "#DBEAFE" }]}>
                        <Ionicons name="construct-outline" size={20} color="#1E40AF" />
                        <Text style={[styles.infoText, { color: "#1E40AF" }]}>
                            Your request is being worked on. You will be notified when it is resolved.
                        </Text>
                    </View>
                )}

                {displayStatus === "Resolved" && (
                    <View style={[styles.infoBox, { backgroundColor: "#DCFCE7" }]}>
                        <Ionicons name="checkmark-circle-outline" size={20} color="#166534" />
                        <Text style={[styles.infoText, { color: "#166534" }]}>
                            This maintenance request has been resolved.
                        </Text>
                    </View>
                )}
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
    infoBox: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        backgroundColor: "#FEF9C3",
        padding: 16,
        borderRadius: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: "#854D0E",
        lineHeight: 20,
    },
});
