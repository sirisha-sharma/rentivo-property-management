import React, { useState } from "react";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
    TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TopBar } from "../../components/TopBar";
import { COLORS } from "../../constants/theme";
import { getPaymentHistory } from "../../api/payment";
import { useFocusEffect } from "@react-navigation/native";

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
            esewa: "#2563EB",
            khalti: "#5C2D91",
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
                return "#10B981";
            case "pending":
                return "#F59E0B";
            case "failed":
                return "#EF4444";
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

            {/* Filter Tabs */}
            <View style={styles.filterContainer}>
                <TouchableOpacity
                    style={[styles.filterTab, filter === "all" && styles.filterTabActive]}
                    onPress={() => setFilter("all")}
                >
                    <Text style={[styles.filterText, filter === "all" && styles.filterTextActive]}>
                        All
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterTab, filter === "completed" && styles.filterTabActive]}
                    onPress={() => setFilter("completed")}
                >
                    <Text
                        style={[styles.filterText, filter === "completed" && styles.filterTextActive]}
                    >
                        Completed
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterTab, filter === "pending" && styles.filterTabActive]}
                    onPress={() => setFilter("pending")}
                >
                    <Text
                        style={[styles.filterText, filter === "pending" && styles.filterTextActive]}
                    >
                        Pending
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterTab, filter === "failed" && styles.filterTabActive]}
                    onPress={() => setFilter("failed")}
                >
                    <Text style={[styles.filterText, filter === "failed" && styles.filterTextActive]}>
                        Failed
                    </Text>
                </TouchableOpacity>
            </View>

            {filteredPayments.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="receipt-outline" size={64} color={COLORS.mutedForeground} />
                    <Text style={styles.emptyText}>No payment history found</Text>
                    <Text style={styles.emptySubtext}>
                        Your completed payments will appear here
                    </Text>
                </View>
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
    filterContainer: {
        flexDirection: "row",
        padding: 16,
        paddingBottom: 8,
        gap: 8,
    },
    filterTab: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: COLORS.muted,
        alignItems: "center",
    },
    filterTabActive: {
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
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 32,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: "600",
        color: COLORS.foreground,
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: COLORS.mutedForeground,
        marginTop: 8,
        textAlign: "center",
    },
});
