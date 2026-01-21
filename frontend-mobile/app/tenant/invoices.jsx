import React, { useContext, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { InvoiceContext } from "../../context/InvoiceContext";
import { Ionicons } from "@expo/vector-icons";
import { TopBar } from "../../components/TopBar";
import { StatusBadge } from "../../components/StatusBadge";
import { COLORS } from "../../constants/theme";

export default function TenantInvoices() {
    const { invoices, fetchInvoices, loading } = useContext(InvoiceContext);
    const [filter, setFilter] = useState("all");

    useEffect(() => {
        fetchInvoices();
    }, []);

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
                <Text style={styles.dateText}>Due: {formatDate(item.dueDate)}</Text>
                {item.description && (
                    <Text style={styles.descriptionText} numberOfLines={1}>
                        {item.description}
                    </Text>
                )}
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <TopBar title="My Invoices" showBack />

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
                            <Text style={styles.emptyTitle}>No invoices</Text>
                            <Text style={styles.emptyText}>You don't have any invoices yet.</Text>
                        </View>
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
