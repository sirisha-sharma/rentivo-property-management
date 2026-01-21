import React, { useContext, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { InvoiceContext } from "../../../context/InvoiceContext";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TopBar } from "../../../components/TopBar";
import { StatusBadge } from "../../../components/StatusBadge";
import { COLORS } from "../../../constants/theme";

export default function InvoiceList() {
    const { invoices, fetchInvoices, updateInvoiceStatus, deleteInvoice, loading } = useContext(InvoiceContext);
    const router = useRouter();
    const [filter, setFilter] = useState("all");

    useEffect(() => {
        fetchInvoices();
    }, []);

    const filteredInvoices = invoices.filter((inv) => {
        if (filter === "all") return true;
        return inv.status?.toLowerCase() === filter;
    });

    const handleMarkPaid = (invoice) => {
        Alert.alert(
            "Mark as Paid",
            `Mark this invoice of NPR ${invoice.amount} as Paid?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Mark Paid",
                    onPress: async () => {
                        try {
                            await updateInvoiceStatus(invoice._id, "Paid");
                        } catch (e) {
                            Alert.alert("Error", "Failed to update status");
                        }
                    },
                },
            ]
        );
    };

    const handleDelete = (invoice) => {
        Alert.alert(
            "Delete Invoice",
            `Are you sure you want to delete this invoice?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteInvoice(invoice._id);
                        } catch (e) {
                            Alert.alert("Error", "Failed to delete invoice");
                        }
                    },
                },
            ]
        );
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "N/A";
        return new Date(dateStr).toLocaleDateString();
    };

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>NPR {item.amount?.toLocaleString()}</Text>
                    <View style={styles.subtextContainer}>
                        <Ionicons name="pricetag-outline" size={12} color={COLORS.mutedForeground} />
                        <Text style={styles.cardSubtitle}>{item.type}</Text>
                    </View>
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
                <StatusBadge status={item.status || "Pending"} />
            </View>

            <View style={styles.divider} />

            <View style={styles.cardFooter}>
                <Text style={styles.dateText}>Due: {formatDate(item.dueDate)}</Text>
                <View style={styles.actionRow}>
                    {item.status !== "Paid" && (
                        <TouchableOpacity style={styles.paidBtn} onPress={() => handleMarkPaid(item)}>
                            <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.success} />
                            <Text style={styles.paidBtnText}>Paid</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <TopBar title="Invoices" showBack />

            {/* Filter Tabs */}
            <View style={styles.filterRow}>
                {["all", "pending", "paid", "overdue"].map((f) => (
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
                    data={filteredInvoices}
                    keyExtractor={(item) => item._id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="document-text" size={48} color={COLORS.border} />
                            <Text style={styles.emptyTitle}>No invoices yet</Text>
                            <Text style={styles.emptyText}>Create invoices for your tenants to track payments.</Text>
                        </View>
                    }
                    refreshing={loading}
                    onRefresh={fetchInvoices}
                />
            )}

            <TouchableOpacity
                style={styles.fab}
                onPress={() => router.push("/landlord/invoices/create")}
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
        fontSize: 18,
        fontWeight: "700",
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
    actionRow: {
        flexDirection: "row",
        gap: 8,
    },
    paidBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: "#D1FAE5",
        borderRadius: 6,
    },
    paidBtnText: {
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
