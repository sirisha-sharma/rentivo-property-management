import React, { useContext, useMemo, useRef, useState } from "react";
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
import * as WebBrowser from "expo-web-browser";
import { WebView } from "react-native-webview";
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
    completed: { bg: "#DCFCE7", text: "#166534" },
    initiated: { bg: "#DBEAFE", text: "#1D4ED8" },
    pending: { bg: "#FEF3C7", text: "#92400E" },
    failed: { bg: "#FEE2E2", text: "#B91C1C" },
    cancelled: { bg: "#FEE2E2", text: "#B91C1C" },
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
    const handledGatewayResultRef = useRef(false);
    const activePaymentIdRef = useRef(null);

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

    const [paymentInitiated, setPaymentInitiated] = useState(false);
    const [paymentData, setPaymentData] = useState(null);
    const [selectedGateway, setSelectedGateway] = useState(null);
    const [processing, setProcessing] = useState(false);

    const paidPlans = useMemo(
        () => (plans || []).filter((plan) => plan.plan !== "trial"),
        [plans]
    );

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

    const getFailureMetaFromUrl = (url) => {
        try {
            const params = new URL(url).searchParams;
            return getFailureMeta({
                reason: params.get("reason"),
                status: params.get("status"),
            });
        } catch (_error) {
            return getFailureMeta({});
        }
    };

    const refreshAfterPayment = async () => {
        await Promise.allSettled([
            refreshSubscriptionData(),
            fetchNotifications(),
        ]);
    };

    const syncSubscriptionPaymentState = async (paymentId) => {
        let latestPayment = null;

        for (let attempt = 0; attempt < 8; attempt++) {
            const response = await getSubscriptionPaymentById(paymentId);
            latestPayment = response.payment;

            if (["completed", "failed", "cancelled"].includes(response.payment?.status)) {
                break;
            }

            await sleep(1500);
        }

        await refreshAfterPayment();
        return latestPayment;
    };

    const handleSuccessfulPayment = async (paymentId) => {
        setPaymentInitiated(false);
        setProcessing(true);

        try {
            const payment = await syncSubscriptionPaymentState(paymentId);
            const validUntil =
                payment?.periodEnd || subscription?.endDate;

            Alert.alert(
                "Subscription Activated",
                `Your ${getSubscriptionPlanLabel(payment?.plan)} plan is active until ${formatSubscriptionDate(validUntil)}.`,
                [{ text: "OK" }]
            );
        } catch (_error) {
            Alert.alert(
                "Subscription Updated",
                "Your payment was confirmed and the subscription is still syncing. Refresh the page in a moment.",
                [{ text: "OK" }]
            );
        } finally {
            setProcessing(false);
        }
    };

    const checkEsewaBrowserPaymentResult = async (paymentId) => {
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
                            onPress: () => {
                                handledGatewayResultRef.current = false;
                            },
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
            Alert.alert(
                "Payment Processing",
                "Your subscription payment is being processed. Refresh this screen in a moment to see the updated status.",
                [{ text: "OK" }]
            );
        } finally {
            setProcessing(false);
        }
    };

    const handleCheckout = async (planKey, gateway) => {
        try {
            setProcessing(true);
            handledGatewayResultRef.current = false;

            const response = await startCheckout(planKey, gateway);
            activePaymentIdRef.current = response.payment?.paymentId;

            if (gateway === "esewa") {
                if (!response.launchUrl) {
                    throw new Error("Failed to initialize eSewa checkout");
                }

                Alert.alert(
                    "Continue in Browser",
                    "eSewa will open in your browser or app. After completing the payment, return to Rentivo and we will sync your subscription automatically.",
                    [
                        {
                            text: "Continue",
                            onPress: async () => {
                                try {
                                    await WebBrowser.openBrowserAsync(response.launchUrl, {
                                        showTitle: true,
                                        enableDefaultShareMenuItem: false,
                                    });
                                } finally {
                                    await checkEsewaBrowserPaymentResult(
                                        response.payment.paymentId
                                    );
                                }
                            },
                        },
                    ]
                );

                return;
            }

            if (response.gatewayData?.payment_url) {
                setPaymentData(response.gatewayData);
                setSelectedGateway("khalti");
                setPaymentInitiated(true);
                return;
            }

            throw new Error("Failed to initialize payment gateway");
        } catch (error) {
            Alert.alert("Upgrade Failed", error.message || "Failed to start payment");
        } finally {
            setProcessing(false);
        }
    };

    const handleGatewayResult = (url) => {
        if (handledGatewayResultRef.current) return;
        handledGatewayResultRef.current = true;

        if (url.includes("/subscription-success")) {
            void handleSuccessfulPayment(activePaymentIdRef.current);
            return;
        }

        const failureMeta = getFailureMetaFromUrl(url);
        setPaymentInitiated(false);
        Alert.alert(failureMeta.title, failureMeta.message, [
            {
                text: "OK",
                onPress: () => {
                    handledGatewayResultRef.current = false;
                },
            },
        ]);
    };

    const verifyPaymentDirectly = async (verifyUrl) => {
        if (handledGatewayResultRef.current) return;
        handledGatewayResultRef.current = true;

        setPaymentInitiated(false);
        setProcessing(true);

        try {
            const response = await fetch(verifyUrl, {
                headers: { "ngrok-skip-browser-warning": "true" },
                redirect: "follow",
            });

            const finalUrl = response.url || "";

            if (finalUrl.includes("/subscription-success")) {
                await handleSuccessfulPayment(activePaymentIdRef.current);
                return;
            }

            if (finalUrl.includes("/subscription-failed")) {
                const failureMeta = getFailureMetaFromUrl(finalUrl);
                Alert.alert(failureMeta.title, failureMeta.message, [
                    {
                        text: "OK",
                        onPress: () => {
                            handledGatewayResultRef.current = false;
                        },
                    },
                ]);
                return;
            }

            await handleSuccessfulPayment(activePaymentIdRef.current);
        } catch (_error) {
            Alert.alert(
                "Payment Processing",
                "Your subscription payment is being processed. Refresh this screen in a moment to see the updated status.",
                [{ text: "OK" }]
            );
        } finally {
            setProcessing(false);
        }
    };

    const handleWebViewNavigationStateChange = (navState) => {
        const { url } = navState;
        if (url.includes("/subscription-success") || url.includes("/subscription-failed")) {
            handleGatewayResult(url);
        }
    };

    const handleShouldStartLoadWithRequest = (request) => {
        const { url } = request;

        if (url.includes("/subscription-success") || url.includes("/subscription-failed")) {
            handleGatewayResult(url);
            return false;
        }

        if (
            url.includes("/api/subscriptions/esewa/verify") ||
            url.includes("/api/subscriptions/khalti/verify") ||
            url.includes("/api/subscriptions/failure")
        ) {
            void verifyPaymentDirectly(url);
            return false;
        }

        return true;
    };

    if (paymentInitiated && paymentData && selectedGateway === "khalti") {
        return (
            <View style={styles.container}>
                <TopBar
                    title="Khalti Upgrade"
                    showBack
                    onBack={() => {
                        Alert.alert(
                            "Cancel Payment",
                            "Are you sure you want to cancel this subscription payment?",
                            [
                                { text: "Keep Paying", style: "cancel" },
                                {
                                    text: "Cancel",
                                    style: "destructive",
                                    onPress: () => {
                                        handledGatewayResultRef.current = false;
                                        setPaymentInitiated(false);
                                        setPaymentData(null);
                                        setSelectedGateway(null);
                                    },
                                },
                            ]
                        );
                    }}
                />

                <WebView
                    source={{ uri: paymentData.payment_url }}
                    style={{ flex: 1 }}
                    onNavigationStateChange={handleWebViewNavigationStateChange}
                    onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
                    javaScriptEnabled
                    domStorageEnabled
                    startInLoadingState
                    renderLoading={() => (
                        <View style={styles.webViewLoading}>
                            <ActivityIndicator size="large" color={COLORS.primary} />
                        </View>
                    )}
                />
            </View>
        );
    }

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
                            {processing || checkoutLoading ? (
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
                                                disabled={processing || checkoutLoading}
                                            >
                                                <Ionicons
                                                    name="wallet-outline"
                                                    size={16}
                                                    color="#fff"
                                                />
                                                <Text style={styles.gatewayButtonText}>
                                                    {isCurrentPlan ? "Extend with eSewa" : "Pay with eSewa"}
                                                </Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={[styles.gatewayButton, styles.gatewayButtonAlt]}
                                                onPress={() => handleCheckout(plan.plan, "khalti")}
                                                disabled={processing || checkoutLoading}
                                            >
                                                <Ionicons
                                                    name="card-outline"
                                                    size={16}
                                                    color={COLORS.primary}
                                                />
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
        borderColor: "#93C5FD",
        backgroundColor: "#EFF6FF",
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
        backgroundColor: "#FEF3C7",
    },
    recommendedText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#92400E",
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
        flexDirection: "row",
        gap: 10,
    },
    gatewayButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: COLORS.primary,
        paddingVertical: 12,
        borderRadius: 12,
    },
    gatewayButtonAlt: {
        backgroundColor: "#EFF6FF",
        borderWidth: 1,
        borderColor: "#BFDBFE",
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
