import React, { useContext, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { InvoiceContext } from "../../../context/InvoiceContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TopBar } from "../../../components/TopBar";
import { StatusBadge } from "../../../components/StatusBadge";
import { FilterChips } from "../../../components/FilterChips";
import { EmptyState } from "../../../components/EmptyState";
import { COLORS } from "../../../constants/theme";
import { useFocusEffect } from "@react-navigation/native";

const FILTERS = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "paid", label: "Paid" },
    { key: "overdue", label: "Overdue" },
];

export default function InvoiceList() {
    const { invoices, fetchInvoices, updateInvoiceStatus, deleteInvoice, loading } = useContext(InvoiceContext);
    const router = useRouter();
    const { propertyId } = useLocalSearchParams();
    const [filter, setFilter] = useState("all");

    useFocusEffect(
        React.useCallback(() => {
            void fetchInvoices();
        }, [fetchInvoices])
    );

    const propertyScopedInvoices = propertyId
        ? invoices.filter(
            (invoice) => String(invoice.propertyId?._id || invoice.propertyId) === String(propertyId)
        )
        : invoices;

    const filteredInvoices = propertyScopedInvoices.filter((inv) => {
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
                        } catch (_error) {
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
                        } catch (_error) {
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
                <View style={{ flex: 1, marginRight: 12 }}>
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

            {/* Breakdown Summary (if available) */}
            {item.breakdown && (item.breakdown.baseRent > 0 || item.breakdown.totalUtilities > 0) && (
                <View style={styles.breakdownSummary}>
                    <Ionicons name="receipt-outline" size={12} color={COLORS.primary} />
                    <Text style={styles.breakdownText}>
                        Rent: NPR {item.breakdown.baseRent?.toLocaleString() || 0} + Utilities: NPR {item.breakdown.totalUtilities?.toLocaleString() || 0}
                    </Text>
                </View>
            )}

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
                        <Ionicons name="trash-outline" size={16} color={COLORS.destructive} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

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
            <TopBar title={propertyId ? "Property Invoices" : "Invoices"} showBack />

            {loading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    style={{ flex: 1 }}
                    data={filteredInvoices}
                    keyExtractor={(item) => item._id}
                    renderItem={renderItem}
                    ListHeaderComponent={renderHeader}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <EmptyState
                            icon="document-text-outline"
                            title="No invoices yet"
                            subtitle={
                                propertyId
                                    ? "No invoices are linked to this property yet."
                                    : "Create invoices for your tenants to track payments."
                            }
                        />
                    }
                    refreshing={loading}
                    onRefresh={fetchInvoices}
                />
            )}

            <TouchableOpacity
                style={styles.fab}
                onPress={() =>
                    router.push(
                        propertyId
                            ? `/landlord/invoices/create?propertyId=${encodeURIComponent(String(propertyId))}`
                            : "/landlord/invoices/create"
                    )
                }
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
        paddingBottom: 128,
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
    breakdownSummary: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 8,
        paddingHorizontal: 8,
        paddingVertical: 6,
        backgroundColor: COLORS.muted,
        borderRadius: 6,
    },
    breakdownText: {
        fontSize: 12,
        color: COLORS.primary,
        fontWeight: "500",
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
    paidBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: COLORS.successSoft,
        borderRadius: 8,
    },
    paidBtnText: {
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
