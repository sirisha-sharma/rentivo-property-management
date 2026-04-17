import React, { useState } from "react";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TopBar } from "../../components/TopBar";
import { FilterChips } from "../../components/FilterChips";
import { EmptyState } from "../../components/EmptyState";
import { COLORS } from "../../constants/theme";
import { getPaymentHistory } from "../../api/payment";
import { useFocusEffect } from "@react-navigation/native";

const FILTERS = [
    { key: "all", label: "All" },
    { key: "completed", label: "Completed" },
    { key: "pending", label: "Pending" },
    { key: "failed", label: "Failed" },
];

export default function PaymentHistory() {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState("all");

    const fetchPayments = React.useCallback(async () => {
        try {
            setLoading(true);
            const data = await getPaymentHistory();
            setPayments(data.payments || []);
        } catch (error) {
            console.error("Failed to fetch payment history:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            void fetchPayments();
        }, [fetchPayments])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchPayments();
        setRefreshing(false);
    };

    const filteredPayments = payments.filter((payment) => {
        if (filter === "all") return true;
        return payment.status?.toLowerCase() === filter;
    });

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const getGatewayIcon = (gateway) => {
        const colors = {
            esewa: COLORS.primary,
            khalti: COLORS.accentLilac,
        };
        return colors[gateway?.toLowerCase()] || COLORS.primary;
    };

    const getGatewayName = (gateway) => {
        const names = {
            esewa: "eSewa",
            khalti: "Khalti",
        };
        return names[gateway?.toLowerCase()] || gateway;
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case "completed":
            case "success":
                return COLORS.success;
            case "pending":
                return COLORS.warning;
            case "failed":
                return COLORS.destructive;
            default:
                return COLORS.mutedForeground;
        }
    };

    const renderPaymentItem = ({ item }) => (
        <View style={styles.paymentCard}>
            <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                    <View
                        style={[
                            styles.gatewayBadge,
                            { backgroundColor: `${getGatewayIcon(item.gateway)}15` },
                        ]}
                    >
                        <Ionicons
                            name="wallet-outline"
                            size={16}
                            color={getGatewayIcon(item.gateway)}
                        />
                        <Text
                            style={[
                                styles.gatewayText,
                                { color: getGatewayIcon(item.gateway) },
                            ]}
                        >
                            {getGatewayName(item.gateway)}
                        </Text>
                    </View>
                </View>
                <View
                    style={[
                        styles.statusBadge,
                        { backgroundColor: `${getStatusColor(item.status)}15` },
                    ]}
                >
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                        {item.status || "Pending"}
                    </Text>
                </View>
            </View>

            <View style={styles.cardBody}>
                <View style={styles.amountSection}>
                    <Text style={styles.amountLabel}>Amount Paid</Text>
                    <Text style={styles.amountValue}>NPR {item.amount?.toLocaleString()}</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.detailsSection}>
                    <View style={styles.detailRow}>
                        <Ionicons name="calendar-outline" size={14} color={COLORS.mutedForeground} />
                        <Text style={styles.detailText}>
                            {formatDate(item.createdAt || item.paymentDate)}
                        </Text>
                    </View>

                    {item.transactionId && (
                        <View style={styles.detailRow}>
                            <Ionicons name="receipt-outline" size={14} color={COLORS.mutedForeground} />
                            <Text style={styles.detailText} numberOfLines={1}>
                                {item.transactionId}
                            </Text>
                        </View>
                    )}

                    {item.invoiceId?.propertyId?.title && (
                        <View style={styles.detailRow}>
                            <Ionicons name="home-outline" size={14} color={COLORS.mutedForeground} />
                            <Text style={styles.detailText} numberOfLines={1}>
                                {item.invoiceId.propertyId.title}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.container}>
                <TopBar title="Payment History" showBack />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Loading payments...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <TopBar title="Payment History" showBack />

            <FilterChips options={FILTERS} selected={filter} onSelect={setFilter} />

            {filteredPayments.length === 0 ? (
                <EmptyState
                    icon="receipt-outline"
                    title="No payment history"
                    subtitle="Your completed payments will appear here"
                />
            ) : (
                <FlatList
                    data={filteredPayments}
                    renderItem={renderPaymentItem}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={COLORS.primary}
                        />
                    }
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
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: COLORS.mutedForeground,
    },
    listContainer: {
        padding: 16,
        paddingTop: 8,
    },
    paymentCard: {
        backgroundColor: COLORS.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 12,
        overflow: "hidden",
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        paddingBottom: 12,
    },
    headerLeft: {
        flex: 1,
    },
    gatewayBadge: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 6,
        gap: 6,
    },
    gatewayText: {
        fontSize: 13,
        fontWeight: "600",
    },
    statusBadge: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 12,
        fontWeight: "600",
        textTransform: "capitalize",
    },
    cardBody: {
        padding: 16,
        paddingTop: 0,
    },
    amountSection: {
        marginBottom: 12,
    },
    amountLabel: {
        fontSize: 12,
        color: COLORS.mutedForeground,
        marginBottom: 4,
    },
    amountValue: {
        fontSize: 24,
        fontWeight: "700",
        color: COLORS.foreground,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: 12,
    },
    detailsSection: {
        gap: 8,
    },
    detailRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    detailText: {
        fontSize: 13,
        color: COLORS.mutedForeground,
        flex: 1,
    },
});
