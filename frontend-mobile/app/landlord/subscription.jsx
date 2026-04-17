import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    StyleSheet,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { TopBar } from "../../components/TopBar";
import { COLORS } from "../../constants/theme";
import { SubscriptionContext } from "../../context/SubscriptionContext";
import { NotificationContext } from "../../context/NotificationContext";
import { SubscriptionSummaryCard } from "../../components/SubscriptionSummaryCard";
import { SubscriptionStatusPill } from "../../components/SubscriptionStatusPill";
import {
    getSubscriptionPaymentById,
} from "../../api/subscription";
import {
    formatCurrencyNpr,
    formatSubscriptionDate,
    getSubscriptionPlanLabel,
} from "../../utils/subscription";

const PAYMENT_STATUS_TONES = {
    completed: { bg: COLORS.successSoft, text: COLORS.success },
    initiated: { bg: COLORS.primarySoft, text: COLORS.primary },
    pending: { bg: COLORS.warningSoft, text: COLORS.warning },
    failed: { bg: COLORS.destructiveSoft, text: COLORS.destructive },
    cancelled: { bg: COLORS.destructiveSoft, text: COLORS.destructive },
};

const paymentStatusLabel = (status) => {
    switch (status) {
        case "completed":
            return "Completed";
        case "initiated":
            return "Initiated";
        case "pending":
            return "Pending";
        case "failed":
            return "Failed";
        case "cancelled":
            return "Cancelled";
        default:
            return status || "Unknown";
    }
};

export default function LandlordSubscriptionScreen() {
    const {
        khaltiReturn,
        paymentId: returnedPaymentId,
        result: returnedResult,
        reason: returnedReason,
        status: returnedStatus,
    } = useLocalSearchParams();
    const {
        subscription,
        plans,
        payments,
        loading,
        paymentsLoading,
        checkoutLoading,
        fetchPaymentHistory,
        fetchSubscription,
        refreshSubscriptionData,
        startCheckout,
    } = useContext(SubscriptionContext);
    const { fetchNotifications } = useContext(NotificationContext);

    const [processing, setProcessing] = useState(false);
    const [activeCheckoutKey, setActiveCheckoutKey] = useState(null);

    const paidPlans = useMemo(
        () => (plans || []).filter((plan) => plan.plan !== "trial"),
        [plans]
    );

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const buildCheckoutKey = (planKey, gateway) => `${planKey}:${gateway}`;

    useFocusEffect(
        React.useCallback(() => {
            void Promise.allSettled([
                fetchSubscription(),
                fetchPaymentHistory(),
                fetchNotifications(),
            ]);
        }, [fetchPaymentHistory, fetchNotifications, fetchSubscription])
    );

    const getFailureMeta = ({ reason, status }) => {
        const normalized = (reason || status || "").toLowerCase();

        if (["pending", "ambiguous", "not_found"].includes(normalized)) {
            return {
                title: "Payment Processing",
                message:
                    "Your subscription payment is still being verified. Please refresh your subscription status in a moment.",
            };
        }

        if (reason === "cancelled") {
            return {
                title: "Payment Cancelled",
                message: "The subscription payment was cancelled before completion.",
            };
        }

        if (reason === "amount_mismatch") {
            return {
                title: "Payment Failed",
                message:
                    "The payment amount could not be verified. Please try the upgrade again.",
            };
        }

        if (reason === "lookup_failed") {
            return {
                title: "Payment Failed",
                message:
                    "The payment provider could not be reached for verification. Please try again.",
            };
        }

        if (status) {
            return {
                title: "Payment Failed",
                message: `Payment status: ${status}. Please try again.`,
            };
        }

        return {
            title: "Payment Failed",
            message:
                "Your subscription payment could not be completed. Please try again.",
        };
    };

    const refreshAfterPayment = useCallback(async () => {
        await Promise.allSettled([
            refreshSubscriptionData(),
            fetchNotifications(),
        ]);
    }, [fetchNotifications, refreshSubscriptionData]);

    const checkBrowserPaymentResult = useCallback(async (paymentId) => {
        setProcessing(true);

        try {
            for (let attempt = 0; attempt < 12; attempt++) {
                const { payment } = await getSubscriptionPaymentById(paymentId);

                if (payment?.status === "completed") {
                    await refreshAfterPayment();
                    Alert.alert(
                        "Subscription Activated",
                        `Your ${getSubscriptionPlanLabel(payment.plan)} plan is active until ${formatSubscriptionDate(payment.periodEnd)}.`,
                        [{ text: "OK" }]
                    );
                    return;
                }

                if (["failed", "cancelled"].includes(payment?.status)) {
                    const failureMeta = getFailureMeta({
                        reason: payment.failureReason?.toLowerCase?.(),
                        status: payment.gatewayResponse?.status,
                    });

                    Alert.alert(failureMeta.title, failureMeta.message, [
                        {
                            text: "OK",
                        },
                    ]);
                    return;
                }

                await sleep(2000);
            }

            await refreshAfterPayment();
            Alert.alert(
                "Payment Processing",
                "Your subscription payment is still being verified. Refresh this screen in a moment to see the updated status.",
                [{ text: "OK" }]
            );
        } catch (_error) {
            if (returnedResult === "failed" || returnedReason || returnedStatus) {
                const failureMeta = getFailureMeta({
                    reason: returnedReason,
                    status: returnedStatus,
                });

                Alert.alert(failureMeta.title, failureMeta.message, [{ text: "OK" }]);
                return;
            }

            Alert.alert(
                "Payment Processing",
                "Your subscription payment is being processed. Refresh this screen in a moment to see the updated status.",
                [{ text: "OK" }]
            );
        } finally {
            setProcessing(false);
            setActiveCheckoutKey(null);
        }
    }, [
        refreshAfterPayment,
        returnedReason,
        returnedResult,
        returnedStatus,
    ]);

    useEffect(() => {
        if (khaltiReturn !== "1" || !returnedPaymentId) {
            return;
        }

        void checkBrowserPaymentResult(returnedPaymentId);
    }, [checkBrowserPaymentResult, khaltiReturn, returnedPaymentId]);

    const handleCheckout = async (planKey, gateway) => {
        const checkoutKey = buildCheckoutKey(planKey, gateway);
        const gatewayLabel = gateway === "esewa" ? "eSewa" : "Khalti";

        try {
            setActiveCheckoutKey(checkoutKey);
            const clientRedirectUri =
                gateway === "khalti"
                    ? Linking.createURL("khalti-subscription-return")
                    : null;

            const response = await startCheckout(planKey, gateway, clientRedirectUri);

            const launchUrl =
                gateway === "esewa"
                    ? response.launchUrl
                    : response.gatewayData?.payment_url;

            if (!launchUrl || !response.payment?.paymentId) {
                throw new Error(`Failed to initialize ${gatewayLabel} checkout`);
            }

            Alert.alert(
                "Continue in Browser",
                `${gatewayLabel} will open in your browser or app. After completing the payment, return to Rentivo and we will sync your subscription automatically.`,
                [
                    {
                        text: "Continue",
                        onPress: async () => {
                            let shouldSyncPayment = true;

                            try {
                                if (gateway === "khalti") {
                                    const sessionResult = await WebBrowser.openAuthSessionAsync(
                                        launchUrl,
                                        clientRedirectUri
                                    );

                                    if (sessionResult.type !== "success") {
                                        shouldSyncPayment = false;
                                        setActiveCheckoutKey(null);
                                        return;
                                    }
                                } else {
                                    await WebBrowser.openBrowserAsync(launchUrl, {
                                        showTitle: true,
                                        enableDefaultShareMenuItem: false,
                                    });
                                }
                            } finally {
                                if (shouldSyncPayment) {
                                    await checkBrowserPaymentResult(response.payment.paymentId);
                                }
                            }
                        },
                    },
                ]
            );
        } catch (error) {
            Alert.alert("Upgrade Failed", error.message || "Failed to start payment");
            setActiveCheckoutKey(null);
        }
    };

    const buttonLabel =
        subscription?.plan === "trial" || subscription?.status !== "active"
            ? "Upgrade Plan"
            : "Manage Plan";

    return (
        <View style={styles.container}>
            <TopBar title="Subscription" showBack />

            {(loading && !subscription) ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Loading subscription...</Text>
                </View>
            ) : (
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    <SubscriptionSummaryCard
                        subscription={subscription}
                        loading={loading}
                        buttonLabel={buttonLabel}
                    />

                    <View style={styles.card}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Upgrade Options</Text>
                            {Boolean(activeCheckoutKey) || processing || checkoutLoading ? (
                                <ActivityIndicator size="small" color={COLORS.primary} />
                            ) : null}
                        </View>
                        <Text style={styles.sectionSubtitle}>
                            Choose a plan and complete payment with eSewa or Khalti in test mode.
                        </Text>

                        <View style={{ gap: 14, marginTop: 16 }}>
                            {paidPlans.map((plan) => {
                                const isCurrentPlan =
                                    subscription?.plan === plan.plan &&
                                    subscription?.status === "active";
                                const esewaCheckoutKey = buildCheckoutKey(plan.plan, "esewa");
                                const khaltiCheckoutKey = buildCheckoutKey(plan.plan, "khalti");
                                const isEsewaLoading = activeCheckoutKey === esewaCheckoutKey;
                                const isKhaltiLoading = activeCheckoutKey === khaltiCheckoutKey;
                                const buttonsDisabled =
                                    Boolean(activeCheckoutKey) || processing || checkoutLoading;

                                return (
                                    <View
                                        key={plan.plan}
                                        style={[
                                            styles.planCard,
                                            isCurrentPlan && styles.planCardActive,
                                        ]}
                                    >
                                        <View style={styles.planHeader}>
                                            <View style={{ flex: 1, gap: 4 }}>
                                                <View style={styles.planTitleRow}>
                                                    <Text style={styles.planTitle}>
                                                        {plan.label}
                                                    </Text>
                                                    {plan.plan === "yearly" ? (
                                                        <View style={styles.recommendedBadge}>
                                                            <Text style={styles.recommendedText}>
                                                                Best Value
                                                            </Text>
                                                        </View>
                                                    ) : null}
                                                </View>
                                                <Text style={styles.planAmount}>
                                                    {formatCurrencyNpr(plan.amount)}
                                                </Text>
                                                <Text style={styles.planMeta}>
                                                    Full landlord access for {plan.durationDays} days
                                                </Text>
                                            </View>

                                            {isCurrentPlan ? (
                                                <SubscriptionStatusPill status="active" />
                                            ) : null}
                                        </View>

                                        <View style={styles.planBullets}>
                                            {[
                                                "Unlimited properties",
                                                "Unlimited tenant invites",
                                                "Separate billing from rent collection",
                                            ].map((bullet) => (
                                                <View key={bullet} style={styles.planBulletRow}>
                                                    <Ionicons name="checkmark-circle" size={15} color={COLORS.success} />
                                                    <Text style={styles.planBullet}>{bullet}</Text>
                                                </View>
                                            ))}
                                        </View>

                                        <View style={styles.gatewayRow}>
                                            <TouchableOpacity
                                                style={styles.gatewayButton}
                                                onPress={() => handleCheckout(plan.plan, "esewa")}
                                                disabled={buttonsDisabled}
                                            >
                                                {isEsewaLoading ? (
                                                    <ActivityIndicator size="small" color="#fff" />
                                                ) : (
                                                    <Ionicons
                                                        name="wallet-outline"
                                                        size={16}
                                                        color="#fff"
                                                    />
                                                )}
                                                <Text style={styles.gatewayButtonText}>
                                                    {isCurrentPlan ? "Extend with eSewa" : "Pay with eSewa"}
                                                </Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={[styles.gatewayButton, styles.gatewayButtonAlt]}
                                                onPress={() => handleCheckout(plan.plan, "khalti")}
                                                disabled={buttonsDisabled}
                                            >
                                                {isKhaltiLoading ? (
                                                    <ActivityIndicator size="small" color={COLORS.primary} />
                                                ) : (
                                                    <Ionicons
                                                        name="card-outline"
                                                        size={16}
                                                        color={COLORS.primary}
                                                    />
                                                )}
                                                <Text
                                                    style={[
                                                        styles.gatewayButtonText,
                                                        styles.gatewayButtonAltText,
                                                    ]}
                                                >
                                                    {isCurrentPlan ? "Extend with Khalti" : "Pay with Khalti"}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </View>

                    {(() => {
                        const successfulPayments = payments.filter(
                            (p) => p.status === "completed"
                        );
                        if (successfulPayments.length === 0) return null;
                        return (
                            <View style={styles.card}>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>Subscription Payments</Text>
                                    {paymentsLoading ? (
                                        <ActivityIndicator size="small" color={COLORS.primary} />
                                    ) : null}
                                </View>

                                <View style={{ gap: 12, marginTop: 12 }}>
                                    {successfulPayments.slice(0, 5).map((payment) => {
                                        const colors = PAYMENT_STATUS_TONES[payment.status] || PAYMENT_STATUS_TONES.initiated;
                                        return (
                                            <View key={payment._id} style={styles.paymentRow}>
                                                <View style={{ flex: 1, gap: 4 }}>
                                                    <Text style={styles.paymentPlan}>
                                                        {getSubscriptionPlanLabel(payment.plan)} via{" "}
                                                        {payment.gateway === "esewa" ? "eSewa" : "Khalti"}
                                                    </Text>
                                                    <Text style={styles.paymentMeta}>
                                                        {formatCurrencyNpr(payment.amount)} •{" "}
                                                        {formatSubscriptionDate(payment.createdAt)}
                                                    </Text>
                                                </View>
                                                <View
                                                    style={[
                                                        styles.paymentStatusPill,
                                                        { backgroundColor: colors.bg },
                                                    ]}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.paymentStatusText,
                                                            { color: colors.text },
                                                        ]}
                                                    >
                                                        {paymentStatusLabel(payment.status)}
                                                    </Text>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        );
                    })()}

                    <View style={styles.infoCard}>
                        <Ionicons
                            name="information-circle-outline"
                            size={20}
                            color={COLORS.primary}
                        />
                        <Text style={styles.infoText}>
                            Subscription payments are separate from tenant rent payments. Use this screen only for the landlord platform plan.
                        </Text>
                    </View>
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scroll: {
        flex: 1,
    },
    content: {
        padding: 16,
        gap: 16,
        paddingBottom: 40,
    },
    loadingContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        color: COLORS.mutedForeground,
    },
    card: {
        backgroundColor: COLORS.card,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 18,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.foreground,
        letterSpacing: -0.2,
    },
    sectionSubtitle: {
        marginTop: 8,
        fontSize: 13,
        lineHeight: 19,
        color: COLORS.mutedForeground,
    },
    planCard: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 18,
        padding: 16,
        backgroundColor: COLORS.card,
        gap: 14,
    },
    planCardActive: {
        borderColor: "rgba(47,123,255,0.45)",
        backgroundColor: COLORS.primarySoft,
    },
    planHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
    },
    planTitleRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 8,
    },
    planTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.foreground,
    },
    recommendedBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: COLORS.warningSoft,
    },
    recommendedText: {
        fontSize: 11,
        fontWeight: "700",
        color: COLORS.warning,
    },
    planAmount: {
        fontSize: 22,
        fontWeight: "700",
        color: COLORS.primary,
        letterSpacing: -0.4,
    },
    planMeta: {
        fontSize: 13,
        color: COLORS.mutedForeground,
    },
    planBullets: {
        gap: 8,
    },
    planBulletRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
    },
    planBullet: {
        fontSize: 13,
        color: COLORS.foreground,
        lineHeight: 19,
        flex: 1,
    },
    gatewayRow: {
        flexDirection: "column",
        gap: 10,
    },
    gatewayButton: {
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: COLORS.primary,
        minHeight: 46,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRadius: 12,
    },
    gatewayButtonAlt: {
        backgroundColor: COLORS.primarySoft,
        borderWidth: 1,
        borderColor: "rgba(47,123,255,0.3)",
    },
    gatewayButtonText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "700",
        textAlign: "center",
        flexShrink: 1,
    },
    gatewayButtonAltText: {
        color: COLORS.primary,
    },
    emptyPayments: {
        marginTop: 12,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 18,
    },
    emptyPaymentsText: {
        fontSize: 13,
        color: COLORS.mutedForeground,
    },
    paymentRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 14,
        borderRadius: 14,
        backgroundColor: COLORS.muted,
    },
    paymentPlan: {
        fontSize: 14,
        fontWeight: "700",
        color: COLORS.foreground,
    },
    paymentMeta: {
        fontSize: 12,
        color: COLORS.mutedForeground,
    },
    paymentStatusPill: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
    },
    paymentStatusText: {
        fontSize: 11,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 0.4,
    },
    infoCard: {
        flexDirection: "row",
        backgroundColor: COLORS.muted,
        borderRadius: 14,
        padding: 14,
        gap: 10,
        alignItems: "flex-start",
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 19,
        color: COLORS.mutedForeground,
    },
    webViewLoading: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.background,
    },
});
