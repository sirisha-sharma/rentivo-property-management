import React, { useContext, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { InvoiceContext } from "../../context/InvoiceContext";
import { Ionicons } from "@expo/vector-icons";
import { TopBar } from "../../components/TopBar";
import { StatusBadge } from "../../components/StatusBadge";
import { FilterChips } from "../../components/FilterChips";
import { EmptyState } from "../../components/EmptyState";
import { COLORS } from "../../constants/theme";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";

const FILTERS = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "paid", label: "Paid" },
    { key: "overdue", label: "Overdue" },
];

export default function TenantInvoices() {
    const { invoices, fetchInvoices, loading } = useContext(InvoiceContext);
    const [filter, setFilter] = useState("all");
    const router = useRouter();

    useFocusEffect(
        React.useCallback(() => {
            void fetchInvoices();

            const intervalId = setInterval(() => {
                void fetchInvoices();
            }, 5000);

            return () => clearInterval(intervalId);
        }, [fetchInvoices])
    );

    const filteredInvoices = invoices.filter((inv) => {
        if (filter === "all") return true;
        return inv.status?.toLowerCase() === filter;
    });

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
                        <Ionicons name="business-outline" size={12} color={COLORS.mutedForeground} />
                        <Text style={styles.cardSubtitle}>
                            From: {item.landlordId?.name || "Landlord"}
                        </Text>
                    </View>
                </View>
                <StatusBadge status={item.status || "Pending"} />
            </View>

            <View style={styles.divider} />

            <View style={styles.cardFooter}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.dateText}>Due: {formatDate(item.dueDate)}</Text>
                    {item.description && (
                        <Text style={styles.descriptionText} numberOfLines={1}>
                            {item.description}
                        </Text>
                    )}
                </View>
                {(item.status?.toLowerCase() === "pending" || item.status?.toLowerCase() === "overdue") && (
                    <TouchableOpacity
                        style={styles.payButton}
                        onPress={() => router.push(`/tenant/payment/${item._id}`)}
                    >
                        <Ionicons name="card-outline" size={16} color="#fff" />
                        <Text style={styles.payButtonText}>Pay Now</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <TopBar title="My Invoices" showBack />

            <FilterChips options={FILTERS} selected={filter} onSelect={setFilter} />

            {loading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={filteredInvoices}
                    keyExtractor={(item) => item._id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <EmptyState
                            icon="document-text-outline"
                            title="No invoices"
                            subtitle="You don't have any invoices yet."
                        />
                    }
                    refreshing={loading}
                    onRefresh={fetchInvoices}
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
    descriptionText: {
        fontSize: 12,
        color: COLORS.mutedForeground,
        fontStyle: "italic",
        flex: 1,
        textAlign: "right",
        marginLeft: 8,
    },
    payButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 6,
    },
    payButtonText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
    },
});
