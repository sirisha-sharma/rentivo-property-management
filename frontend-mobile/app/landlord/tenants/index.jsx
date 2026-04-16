import React, { useContext, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { TenantContext } from "../../../context/TenantContext";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { TopBar } from "../../../components/TopBar";
import { StatusBadge } from "../../../components/StatusBadge";
import { FilterChips } from "../../../components/FilterChips";
import { EmptyState } from "../../../components/EmptyState";
import { COLORS } from "../../../constants/theme";
import { SubscriptionContext } from "../../../context/SubscriptionContext";
import {
    SUBSCRIPTION_ACTIONS,
    getSubscriptionActionAccess,
    getSubscriptionActionPrompt,
} from "../../../utils/subscription";

const FILTERS = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "pending", label: "Pending" },
];

export default function TenantList() {
    const { tenants, fetchTenants, deleteTenant, loading } = useContext(TenantContext);
    const { subscription, fetchSubscription } = useContext(SubscriptionContext);
    const router = useRouter();
    const [filter, setFilter] = useState("all");

    useFocusEffect(
        React.useCallback(() => {
            void fetchTenants();
            void fetchSubscription();
        }, [fetchSubscription, fetchTenants])
    );

    const canInviteTenant = getSubscriptionActionAccess(
        subscription,
        SUBSCRIPTION_ACTIONS.INVITE_TENANT
    );
    const actionPrompt = getSubscriptionActionPrompt({
        subscription,
        action: SUBSCRIPTION_ACTIONS.INVITE_TENANT,
    });

    const filteredTenants = tenants.filter(t => {
        if (filter === "all") return true;
        return t.status?.toLowerCase() === filter;
    });

    const handleRemove = (tenant) => {
        Alert.alert(
            "Remove Tenant",
            `Are you sure you want to remove ${tenant.userId?.name || "this tenant"}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteTenant(tenant._id);
                        } catch (_error) {
                            Alert.alert("Error", "Failed to remove tenant");
                        }
                    },
                },
            ]
        );
    };

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={styles.cardTitle}>{item.userId?.name || "Pending User"}</Text>
                    <View style={styles.subtextContainer}>
                        <Ionicons name="home-outline" size={12} color={COLORS.mutedForeground} />
                        <Text style={styles.cardSubtitle}>{item.propertyId?.title || "Unknown Property"}</Text>
                    </View>
                    <View style={styles.subtextContainer}>
                        <Ionicons name="mail-outline" size={12} color={COLORS.mutedForeground} />
                        <Text style={styles.cardSubtitle}>{item.userId?.email || "-"}</Text>
                    </View>
                </View>
                <StatusBadge status={item.status || "Active"} />
            </View>

            <View style={styles.divider} />

            <View style={styles.cardFooter}>
                <Text style={styles.dateText}>Lease ends: {item.leaseEnd ? new Date(item.leaseEnd).toLocaleDateString() : "N/A"}</Text>
                <View style={styles.actionRow}>
                    {item.status?.toLowerCase() === "active" && item.userId?._id && item.propertyId?._id && (
                        <TouchableOpacity
                            style={styles.messageBtn}
                            onPress={() => {
                                const threadId = `${item.userId._id}_${item.propertyId._id}`;
                                router.push(`/messages/${threadId}?name=${encodeURIComponent(item.userId?.name || "Tenant")}&property=${encodeURIComponent(item.propertyId?.title || "")}`);
                            }}
                        >
                            <Ionicons name="chatbubble-outline" size={16} color={COLORS.primary} />
                            <Text style={styles.messageBtnText}>Message</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemove(item)}>
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                        <Text style={styles.removeBtnText}>Remove</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <TopBar title="My Tenants" showBack />

            <FilterChips options={FILTERS} selected={filter} onSelect={setFilter} />

            {loading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    style={{ flex: 1 }}
                    data={filteredTenants}
                    keyExtractor={(item) => item._id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <EmptyState
                            icon="people-outline"
                            title="No tenants yet"
                            subtitle="Invite tenants to your properties to see them here."
                        />
                    }
                    refreshing={loading}
                    onRefresh={fetchTenants}
                />
            )}

            <TouchableOpacity
                style={styles.fab}
                onPress={() => {
                    if (canInviteTenant) {
                        router.push("/landlord/tenants/invite");
                        return;
                    }

                    Alert.alert(actionPrompt.title, actionPrompt.message, [
                        { text: "Cancel", style: "cancel" },
                        {
                            text: actionPrompt.cta,
                            onPress: () => router.push("/landlord/subscription"),
                        },
                    ]);
                }}
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
        paddingHorizontal: 16,
        paddingBottom: 120,
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
        fontWeight: "600",
        color: COLORS.foreground,
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
    dateText: {
        fontSize: 12,
        color: COLORS.mutedForeground,
    },
    actionRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
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
    messageBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: "#DBEAFE",
        borderRadius: 8,
    },
    messageBtnText: {
        fontSize: 12,
        color: COLORS.primary,
        fontWeight: "500",
    },
    removeBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: "#FEE2E2",
        borderRadius: 8,
    },
    removeBtnText: {
        fontSize: 12,
        color: "#EF4444",
        fontWeight: "500",
    },
});
