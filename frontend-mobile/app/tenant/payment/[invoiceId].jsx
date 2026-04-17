import React, { useState, useEffect, useContext, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { TopBar } from "../../../components/TopBar";
import { COLORS } from "../../../constants/theme";
import { getPaymentById, initiatePayment } from "../../../api/payment";
import { getInvoiceById } from "../../../api/invoice";
import { InvoiceContext } from "../../../context/InvoiceContext";
import { NotificationContext } from "../../../context/NotificationContext";

export default function PaymentScreen() {
    const {
        invoiceId,
        khaltiReturn,
        paymentId: returnedPaymentId,
        result: returnedResult,
        reason: returnedReason,
        status: returnedStatus,
    } = useLocalSearchParams();
    const router = useRouter();
    const { fetchInvoices } = useContext(InvoiceContext);
    const { fetchNotifications } = useContext(NotificationContext);

    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [activeGateway, setActiveGateway] = useState(null);

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const getFailureMeta = ({ reason, status }) => {
        const normalized = (reason || status || "").toLowerCase();

        if (["pending", "ambiguous", "not_found"].includes(normalized)) {
            return {
                title: "Payment Processing",
                message: "Your payment is still being verified. Please check your invoices again in a few moments.",
            };
        }

        if (reason === "signature_mismatch") {
            return {
                title: "Payment Failed",
                message: "Payment verification failed. Please try again.",
            };
        }

        if (reason === "amount_mismatch") {
            return {
                title: "Payment Failed",
                message: "Payment amount mismatch. Please try again.",
            };
        }

        if (reason === "cancelled") {
            return {
                title: "Payment Failed",
                message: "Payment was cancelled.",
            };
        }

        if (reason === "lookup_failed") {
            return {
                title: "Payment Failed",
                message: "Could not verify payment with the provider. Please try again.",
            };
        }

        if (reason === "failed") {
            return {
                title: "Payment Failed",
                message: "The payment provider reported this payment as failed.",
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
            message: "Your payment could not be processed. Please try again.",
        };
    };

    const fetchInvoiceDetails = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getInvoiceById(invoiceId);
            setInvoice(data.invoice);
        } catch (error) {
            Alert.alert("Error", error.message || "Failed to load invoice details");
            router.back();
        } finally {
            setLoading(false);
        }
    }, [invoiceId, router]);

    useEffect(() => {
        void fetchInvoiceDetails();
    }, [fetchInvoiceDetails]);

    const checkBrowserPaymentResult = useCallback(async (paymentId) => {
        setProcessing(true);

        try {
            for (let attempt = 0; attempt < 12; attempt++) {
                const [{ payment }, invoiceResponse] = await Promise.all([
                    getPaymentById(paymentId),
                    getInvoiceById(invoiceId),
                ]);

                setInvoice(invoiceResponse.invoice);

                if (invoiceResponse.invoice?.status === "Paid" || payment?.status === "completed") {
                    await Promise.allSettled([fetchInvoices(), fetchNotifications()]);
                    Alert.alert(
                        "Payment Successful",
                        "Your payment has been processed successfully and the invoice is now marked as Paid.",
                        [{ text: "OK", onPress: () => router.replace("/tenant/invoices") }]
                    );
                    return;
                }

                if (payment?.status === "failed") {
                    const failureMeta = getFailureMeta({
                        reason:
                            payment.gatewayResponse?.status?.toLowerCase() === "failed"
                                ? "failed"
                                : payment.failureReason?.toLowerCase?.(),
                        status: payment.gatewayResponse?.status,
                    });

                    Alert.alert(failureMeta.title, failureMeta.message, [
                        {
                            text: "OK",
                            onPress: () => {},
                        },
                    ]);
                    return;
                }

                await sleep(2000);
            }

            Alert.alert(
                "Payment Processing",
                "Your payment is still being verified. Please check your invoices again in a moment.",
                [{ text: "OK", onPress: () => router.replace("/tenant/invoices") }]
            );
        } catch (_error) {
            if (returnedResult === "failed" || returnedReason || returnedStatus) {
                const failureMeta = getFailureMeta({
                    reason: returnedReason,
                    status: returnedStatus,
                });

                Alert.alert(failureMeta.title, failureMeta.message, [
                    { text: "OK", onPress: () => router.replace("/tenant/invoices") },
                ]);
                return;
            }

            Alert.alert(
                "Payment Processing",
                "Your payment is being processed. Please check your invoices again in a moment.",
                [{ text: "OK", onPress: () => router.replace("/tenant/invoices") }]
            );
        } finally {
            setProcessing(false);
            setActiveGateway(null);
        }
    }, [
        fetchInvoices,
        fetchNotifications,
        invoiceId,
        returnedReason,
        returnedResult,
        returnedStatus,
        router,
    ]);

    useEffect(() => {
        if (khaltiReturn !== "1" || !returnedPaymentId) {
            return;
        }

        void checkBrowserPaymentResult(returnedPaymentId);
    }, [checkBrowserPaymentResult, khaltiReturn, returnedPaymentId]);

    const handleGatewayPayment = async (gateway) => {
        const gatewayLabel = gateway === "esewa" ? "eSewa" : "Khalti";

        try {
            setActiveGateway(gateway);
            const clientRedirectUri =
                gateway === "khalti"
                    ? Linking.createURL("khalti-payment-return")
                    : null;
            const response = await initiatePayment(invoiceId, gateway, clientRedirectUri);
            const launchUrl =
                gateway === "esewa"
                    ? response.launchUrl
                    : response.gatewayData?.payment_url;

            if (!response.success || !launchUrl || !response.payment?.paymentId) {
                throw new Error(`Failed to initialize ${gatewayLabel} payment`);
            }

            Alert.alert(
                "Continue in Browser",
                `${gatewayLabel} will open in your browser or app. After completing the payment, return to Rentivo.`,
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
                                        setActiveGateway(null);
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
            Alert.alert("Error", error.message || "Failed to initiate payment");
            setActiveGateway(null);
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <TopBar title="Payment" showBack />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Loading invoice...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <TopBar title="Payment" showBack />

            <ScrollView style={styles.content}>
                {/* Invoice Details */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Invoice Details</Text>
                    <View style={styles.divider} />

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Amount:</Text>
                        <Text style={styles.detailValue}>NPR {invoice?.amount?.toLocaleString()}</Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Invoice Type:</Text>
                        <Text style={styles.detailValue}>{invoice?.type}</Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Property:</Text>
                        <Text style={styles.detailValue}>{invoice?.propertyId?.title || "N/A"}</Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Due Date:</Text>
                        <Text style={styles.detailValue}>
                            {new Date(invoice?.dueDate).toLocaleDateString()}
                        </Text>
                    </View>

                    {invoice?.description && (
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Description:</Text>
                            <Text style={styles.detailValue}>{invoice.description}</Text>
                        </View>
                    )}
                </View>

                {/* Breakdown Details (if available) */}
                {invoice?.breakdown && (invoice.breakdown.baseRent > 0 || invoice.breakdown.totalUtilities > 0) && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Cost Breakdown</Text>
                        <View style={styles.divider} />

                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Base Rent:</Text>
                            <Text style={styles.detailValue}>NPR {invoice.breakdown.baseRent?.toLocaleString() || 0}</Text>
                        </View>

                        {invoice.breakdown.utilities?.electricity > 0 && (
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>  Electricity:</Text>
                                <Text style={styles.detailValue}>NPR {invoice.breakdown.utilities.electricity.toLocaleString()}</Text>
                            </View>
                        )}
                        {invoice.breakdown.utilities?.water > 0 && (
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>  Water:</Text>
                                <Text style={styles.detailValue}>NPR {invoice.breakdown.utilities.water.toLocaleString()}</Text>
                            </View>
                        )}
                        {invoice.breakdown.utilities?.internet > 0 && (
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>  Internet:</Text>
                                <Text style={styles.detailValue}>NPR {invoice.breakdown.utilities.internet.toLocaleString()}</Text>
                            </View>
                        )}
                        {invoice.breakdown.utilities?.gas > 0 && (
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>  Gas:</Text>
                                <Text style={styles.detailValue}>NPR {invoice.breakdown.utilities.gas.toLocaleString()}</Text>
                            </View>
                        )}
                        {invoice.breakdown.utilities?.waste > 0 && (
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>  Waste:</Text>
                                <Text style={styles.detailValue}>NPR {invoice.breakdown.utilities.waste.toLocaleString()}</Text>
                            </View>
                        )}
                        {invoice.breakdown.utilities?.other > 0 && (
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>  Other:</Text>
                                <Text style={styles.detailValue}>NPR {invoice.breakdown.utilities.other.toLocaleString()}</Text>
                            </View>
                        )}

                        <View style={[styles.divider, { marginVertical: 8 }]} />
                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { fontWeight: "600", color: COLORS.foreground }]}>Total Utilities:</Text>
                            <Text style={[styles.detailValue, { fontWeight: "600" }]}>NPR {invoice.breakdown.totalUtilities?.toLocaleString() || 0}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { fontWeight: "700", color: COLORS.primary }]}>Total Amount:</Text>
                            <Text style={[styles.detailValue, { fontWeight: "700", color: COLORS.primary }]}>NPR {invoice.amount?.toLocaleString()}</Text>
                        </View>
                    </View>
                )}

                {/* Payment Method Selection */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Select Payment Method</Text>
                    <View style={styles.divider} />

                    <TouchableOpacity
                        style={[
                            styles.paymentOption,
                            activeGateway === "esewa" && styles.paymentOptionActive,
                        ]}
                        onPress={() => handleGatewayPayment("esewa")}
                        disabled={Boolean(activeGateway) || processing}
                    >
                        <View style={styles.paymentOptionContent}>
                            <Ionicons name="wallet-outline" size={24} color={COLORS.primary} />
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={styles.paymentOptionTitle}>eSewa</Text>
                                <Text style={styles.paymentOptionSubtitle}>
                                    Pay securely using eSewa wallet
                                </Text>
                            </View>
                            {activeGateway === "esewa" ? (
                                <ActivityIndicator size="small" color={COLORS.primary} />
                            ) : (
                                <Ionicons name="chevron-forward" size={20} color={COLORS.mutedForeground} />
                            )}
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.paymentOption,
                            styles.paymentOptionSpacing,
                            activeGateway === "khalti" && styles.paymentOptionActive,
                        ]}
                        onPress={() => handleGatewayPayment("khalti")}
                        disabled={Boolean(activeGateway) || processing}
                    >
                        <View style={styles.paymentOptionContent}>
                            <Ionicons
                                name="wallet-outline"
                                size={24}
                                color={COLORS.accentLilac}
                            />
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={styles.paymentOptionTitle}>Khalti</Text>
                                <Text style={styles.paymentOptionSubtitle}>
                                    Pay securely using Khalti wallet
                                </Text>
                            </View>
                            {activeGateway === "khalti" ? (
                                <ActivityIndicator size="small" color={COLORS.primary} />
                            ) : (
                                <Ionicons name="chevron-forward" size={20} color={COLORS.mutedForeground} />
                            )}
                        </View>
                    </TouchableOpacity>

                </View>

                {/* Payment Info */}
                <View style={styles.infoCard}>
                    <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
                    <Text style={styles.infoText}>
                        You will be redirected to your selected payment gateway to complete the payment securely.
                    </Text>
                </View>
            </ScrollView>
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
    content: {
        flex: 1,
        padding: 16,
    },
    card: {
        backgroundColor: COLORS.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 16,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.foreground,
        marginBottom: 8,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: 12,
    },
    detailRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 12,
    },
    detailLabel: {
        fontSize: 14,
        color: COLORS.mutedForeground,
        flex: 1,
    },
    detailValue: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.foreground,
        flex: 1,
        textAlign: "right",
    },
    paymentOption: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 14,
        padding: 16,
    },
    paymentOptionSpacing: {
        marginTop: 12,
    },
    paymentOptionActive: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primarySoft,
    },
    paymentOptionContent: {
        flexDirection: "row",
        alignItems: "center",
    },
    paymentOptionTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.foreground,
    },
    paymentOptionSubtitle: {
        fontSize: 13,
        color: COLORS.mutedForeground,
        marginTop: 2,
    },
    infoCard: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        backgroundColor: COLORS.surfaceElevated,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: COLORS.mutedForeground,
        lineHeight: 20,
    },
    webViewLoading: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: COLORS.background,
    },
});
