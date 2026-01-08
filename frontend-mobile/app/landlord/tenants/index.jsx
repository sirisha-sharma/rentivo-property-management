import React, { useContext, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { TenantContext } from "../../../context/TenantContext";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TopBar } from "../../../components/TopBar";
import { StatusBadge } from "../../../components/StatusBadge";
import { COLORS } from "../../../constants/theme";

export default function TenantList() {
    const { tenants, fetchTenants, loading } = useContext(TenantContext);
    const router = useRouter();

    useEffect(() => {
        fetchTenants();
    }, []);

    const renderItem = ({ item }) => (
        <TouchableOpacity style={styles.card}>
            <View style={styles.cardHeader}>
                <View>
                    <Text style={styles.cardTitle}>{item.userId?.name || "Pending User"}</Text>
                    <View style={styles.subtextContainer}>
                        <Ionicons name="home-outline" size={12} color={COLORS.mutedForeground} />
                        <Text style={styles.cardSubtitle}>{item.propertyId?.title || "Unknown Property"}</Text>
                    </View>
                </View>
                <StatusBadge status={item.status || "Active"} />
            </View>

            <View style={styles.divider} />

            <View style={styles.cardFooter}>
                <Text style={styles.dateText}>Lease ends: {item.leaseEnd ? new Date(item.leaseEnd).toLocaleDateString() : "N/A"}</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.mutedForeground} />
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <TopBar title="My Tenants" showBack />

            {loading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={tenants}
                    keyExtractor={(item) => item._id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="people" size={48} color={COLORS.border} />
                            <Text style={styles.emptyTitle}>No tenants yet</Text>
                            <Text style={styles.emptyText}>Invite tenants to your properties to see them here.</Text>
                        </View>
                    }
                    refreshing={loading}
                    onRefresh={fetchTenants}
                />
            )}

            <TouchableOpacity
                style={styles.fab}
                onPress={() => router.push("/landlord/tenants/invite")}
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
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    dateText: {
        fontSize: 12,
        color: COLORS.mutedForeground,
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
});
