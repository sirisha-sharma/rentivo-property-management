import React, { useContext, useEffect, useState, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Alert,
    Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { MaintenanceContext } from "../../../context/MaintenanceContext";
import { TopBar } from "../../../components/TopBar";
import { StatusBadge } from "../../../components/StatusBadge";
import { COLORS } from "../../../constants/theme";
import { resolveMediaUrl } from "../../../utils/media";

// Tenant Maintenance Request Detail Screen
// Shows full details of a maintenance request submitted by the tenant
export default function TenantMaintenanceDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { getRequestById } = useContext(MaintenanceContext);
    const [request, setRequest] = useState(null);
    const [pageLoading, setPageLoading] = useState(true);

    const getDisplayStatus = (status) => (status === "Pending" ? "Open" : status);

    const loadRequest = useCallback(async () => {
        try {
            const data = await getRequestById(id);
            setRequest(data);
        } catch (_err) {
            Alert.alert("Error", "Failed to load maintenance request");
            router.back();
        } finally {
            setPageLoading(false);
        }
    }, [getRequestById, id, router]);

    // Fetch request details when screen loads
    useEffect(() => {
        loadRequest();
    }, [loadRequest]);

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

                {request.photos?.length ? (
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>Photos</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.photoRow}
                        >
                            {request.photos.map((photo, index) => (
                                <Image
                                    key={`${photo}-${index}`}
                                    source={{ uri: resolveMediaUrl(photo) }}
                                    style={styles.photoPreview}
                                />
                            ))}
                        </ScrollView>
                    </View>
                ) : null}

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
                        <Ionicons name="information-circle-outline" size={20} color={COLORS.warning} />
                        <Text style={styles.infoText}>Your request is open. The landlord will review it soon.</Text>
                    </View>
                )}

                {displayStatus === "In Progress" && (
                    <View style={[styles.infoBox, { backgroundColor: COLORS.primarySoft }]}>
                        <Ionicons name="construct-outline" size={20} color={COLORS.primary} />
                        <Text style={[styles.infoText, { color: COLORS.primary }]}>
                            Your request is being worked on. You will be notified when it is resolved.
                        </Text>
                    </View>
                )}

                {displayStatus === "Resolved" && (
                    <View style={[styles.infoBox, { backgroundColor: COLORS.successSoft }]}>
                        <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.success} />
                        <Text style={[styles.infoText, { color: COLORS.success }]}>
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
    photoRow: {
        gap: 10,
    },
    photoPreview: {
        width: 152,
        height: 112,
        borderRadius: 14,
        backgroundColor: COLORS.muted,
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
        backgroundColor: COLORS.warningSoft,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(245, 158, 11, 0.24)",
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: COLORS.warning,
        lineHeight: 20,
    },
});
