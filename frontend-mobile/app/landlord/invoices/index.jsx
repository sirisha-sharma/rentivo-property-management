import React, { useContext, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { InvoiceContext } from "../../../context/InvoiceContext";
import { PropertyContext } from "../../../context/PropertyContext";
import { TenantContext } from "../../../context/TenantContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TopBar } from "../../../components/TopBar";
import { StatusBadge } from "../../../components/StatusBadge";
import { FilterChips } from "../../../components/FilterChips";
import { EmptyState } from "../../../components/EmptyState";
import SplitUtilityBillModal from "../../../components/SplitUtilityBillModal";
import { COLORS } from "../../../constants/theme";
import { useFocusEffect } from "@react-navigation/native";
import { shareInvoicePdfAsync } from "../../../utils/invoicePdf";

const FILTERS = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "paid", label: "Paid" },
    { key: "overdue", label: "Overdue" },
];

export default function InvoiceList() {
    const {
        invoices,
        fetchInvoices,
        updateInvoiceStatus,
        deleteInvoice,
        loading,
        splitUtilityBill,
    } = useContext(InvoiceContext);
    const { properties, fetchProperties } = useContext(PropertyContext);
    const { tenants, fetchTenants } = useContext(TenantContext);
    const router = useRouter();
    const { propertyId } = useLocalSearchParams();
    const [filter, setFilter] = useState("all");
    const [activeInvoiceId, setActiveInvoiceId] = useState(null);
    const [splitModalVisible, setSplitModalVisible] = useState(false);
    const [splitSubmitting, setSplitSubmitting] = useState(false);

    useFocusEffect(
        React.useCallback(() => {
            void Promise.allSettled([fetchInvoices(), fetchProperties(), fetchTenants()]);
        }, [fetchInvoices, fetchProperties, fetchTenants])
    );

    const selectedPropertyId = propertyId ? String(propertyId) : "";
    const modalProperties = selectedPropertyId
        ? properties.filter((property) => String(property._id) === selectedPropertyId)
        : properties;

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

    const handleOpenSplitModal = () => {
        if (modalProperties.length === 0) {
            Alert.alert("No Properties", "Add a property before splitting a utility bill.");
            return;
        }

        setSplitModalVisible(true);
    };

    const handleSplitSubmit = async (formData) => {
        try {
            setSplitSubmitting(true);
            const response = await splitUtilityBill(formData);
            await fetchInvoices();
            setSplitModalVisible(false);
            Alert.alert("Success", response?.message || "Utility invoices created successfully.");
        } finally {
            setSplitSubmitting(false);
        }
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
                    <TouchableOpacity
                        style={styles.downloadBtn}
                        onPress={() => handleDownloadInvoice(item)}
                        disabled={activeInvoiceId === item._id}
                    >
                        {activeInvoiceId === item._id ? (
                            <ActivityIndicator size="small" color={COLORS.primary} />
                        ) : (
                            <>
                                <Ionicons name="download-outline" size={16} color={COLORS.primary} />
                                <Text style={styles.downloadBtnText}>PDF</Text>
                            </>
                        )}
                    </TouchableOpacity>
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
            <View style={styles.utilityCard}>
                <View style={styles.utilityCardCopy}>
                    <Text style={styles.utilityCardTitle}>Split a shared utility bill</Text>
                    <Text style={styles.utilityCardText}>
                        Upload one bill and create split invoices for every active tenant on the property.
                    </Text>
                </View>
                <TouchableOpacity style={styles.utilityCardButton} onPress={handleOpenSplitModal}>
                    <Ionicons name="git-branch-outline" size={16} color="#fff" />
                    <Text style={styles.utilityCardButtonText}>Split Bill</Text>
                </TouchableOpacity>
            </View>
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

            <SplitUtilityBillModal
                visible={splitModalVisible}
                onClose={() => setSplitModalVisible(false)}
                onSubmit={handleSplitSubmit}
                properties={modalProperties}
                tenants={tenants}
                initialPropertyId={selectedPropertyId}
                lockedPropertyId={selectedPropertyId}
                submitting={splitSubmitting}
            />
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
    utilityCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 16,
        padding: 16,
        marginBottom: 14,
    },
    utilityCardCopy: {
        flex: 1,
        gap: 4,
    },
    utilityCardTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: COLORS.foreground,
    },
    utilityCardText: {
        fontSize: 13,
        lineHeight: 19,
        color: COLORS.mutedForeground,
    },
    utilityCardButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: COLORS.primary,
    },
    utilityCardButtonText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#fff",
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
    downloadBtn: {
        minWidth: 78,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: COLORS.primarySoft,
        borderRadius: 8,
    },
    downloadBtnText: {
        fontSize: 12,
        color: COLORS.primary,
        fontWeight: "700",
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
