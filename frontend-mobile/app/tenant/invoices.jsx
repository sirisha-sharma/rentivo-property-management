import React, { useContext, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { InvoiceContext } from "../../context/InvoiceContext";
import { Ionicons } from "@expo/vector-icons";
import { TopBar } from "../../components/TopBar";
import { StatusBadge } from "../../components/StatusBadge";
import { FilterChips } from "../../components/FilterChips";
import { EmptyState } from "../../components/EmptyState";
import { COLORS } from "../../constants/theme";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { shareInvoicePdfAsync } from "../../utils/invoicePdf";

const FILTERS = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "paid", label: "Paid" },
    { key: "overdue", label: "Overdue" },
];

export default function TenantInvoices() {
    const { invoices, fetchInvoices, loading } = useContext(InvoiceContext);
    const [filter, setFilter] = useState("all");
    const [activeInvoiceId, setActiveInvoiceId] = useState(null);
    const router = useRouter();

    useFocusEffect(
        React.useCallback(() => {
            void fetchInvoices();
        }, [fetchInvoices])
    );

    const filteredInvoices = invoices.filter((inv) => {
        if (filter === "all") return true;
        return inv.status?.toLowerCase() === filter;
    });
    const outstandingInvoices = invoices.filter(
        (inv) => ["pending", "overdue"].includes(inv.status?.toLowerCase())
    );

    const formatDate = (dateStr) => {
        if (!dateStr) return "N/A";
        return new Date(dateStr).toLocaleDateString();
    };

    const handleDownloadInvoice = async (invoice) => {
        try {
            setActiveInvoiceId(invoice._id);
            const result = await shareInvoicePdfAsync(invoice);

            if (result.openedPrintDialog) {
                Alert.alert("Print Ready", "The print dialog has been opened for this invoice.");
                return;
            }

            if (!result.shared) {
                Alert.alert("Invoice Saved", `${result.fileName} has been saved on your device.`);
            }
        } catch (_error) {
            Alert.alert("Download Failed", "We couldn't create the invoice PDF right now.");
        } finally {
            setActiveInvoiceId(null);
        }
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
                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={styles.downloadButton}
                        onPress={() => handleDownloadInvoice(item)}
                        disabled={activeInvoiceId === item._id}
                    >
                        {activeInvoiceId === item._id ? (
                            <ActivityIndicator size="small" color={COLORS.primary} />
                        ) : (
                            <>
                                <Ionicons name="download-outline" size={16} color={COLORS.primary} />
                                <Text style={styles.downloadButtonText}>PDF</Text>
                            </>
                        )}
                    </TouchableOpacity>

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
        </View>
    );

    return (
        <View style={styles.container}>
            <TopBar title="My Invoices" showBack />

            <View style={styles.heroCard}>
                <View style={styles.heroIcon}>
                    <Ionicons name="receipt-outline" size={22} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.heroTitle}>Billing overview</Text>
                    <Text style={styles.heroText}>
                        {outstandingInvoices.length
                            ? `${outstandingInvoices.length} invoice${outstandingInvoices.length > 1 ? "s" : ""} still need attention.`
                            : "All invoices are up to date right now."}
                    </Text>
                </View>
            </View>

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
    heroCard: {
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 8,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        backgroundColor: COLORS.surface,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 16,
    },
    heroIcon: {
        width: 46,
        height: 46,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.primarySoft,
        borderWidth: 1,
        borderColor: "rgba(47,123,255,0.22)",
    },
    heroTitle: {
        fontSize: 17,
        fontWeight: "800",
        color: COLORS.foreground,
    },
    heroText: {
        marginTop: 4,
        fontSize: 13,
        lineHeight: 19,
        color: COLORS.mutedForeground,
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
        alignItems: "flex-end",
        gap: 8,
    },
    dateText: {
        fontSize: 12,
        color: COLORS.mutedForeground,
    },
    descriptionText: {
        fontSize: 11,
        color: COLORS.mutedForeground,
        fontStyle: "italic",
        marginTop: 2,
    },
    actionRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    downloadButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.primarySoft,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 5,
    },
    downloadButtonText: {
        color: COLORS.primary,
        fontSize: 12,
        fontWeight: "700",
    },
    payButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.primary,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 5,
    },
    payButtonText: {
        color: "#fff",
        fontSize: 13,
        fontWeight: "600",
    },
});
