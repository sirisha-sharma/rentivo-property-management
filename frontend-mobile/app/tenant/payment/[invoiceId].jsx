import React, { useState, useEffect, useRef, useContext } from "react";
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
import * as WebBrowser from "expo-web-browser";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { TopBar } from "../../../components/TopBar";
import { COLORS } from "../../../constants/theme";
import { getPaymentById, initiatePayment } from "../../../api/payment";
import { getInvoiceById } from "../../../api/invoice";
import { InvoiceContext } from "../../../context/InvoiceContext";
import { NotificationContext } from "../../../context/NotificationContext";

export default function PaymentScreen() {
    const { invoiceId } = useLocalSearchParams();
    const router = useRouter();
    const webViewRef = useRef(null);
    const handledGatewayResultRef = useRef(false);
    const { fetchInvoices } = useContext(InvoiceContext);
    const { fetchNotifications } = useContext(NotificationContext);

    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [paymentInitiated, setPaymentInitiated] = useState(false);
    const [paymentData, setPaymentData] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [selectedGateway, setSelectedGateway] = useState(null);

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const getInvoiceIdFromUrl = (url) => {
        try {
            return new URL(url).searchParams.get("invoice");
        } catch (_error) {
            return null;
        }
    };

    const getFailureMeta = ({ reason, status }) => {
        const normalized = (reason || status || "").toLowerCase();

        if (["pending", "ambiguous", "not_found"].includes(normalized)) {
            return {
                title: "Payment Processing",
                message: "Your payment is still being verified with eSewa. Please check your invoices again in a few moments.",
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
                message: "eSewa reported this payment as failed.",
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

    const fetchInvoiceDetails = React.useCallback(async () => {
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

    const handleEsewaPayment = async () => {
        try {
            setProcessing(true);
            handledGatewayResultRef.current = false;
            const response = await initiatePayment(invoiceId, "esewa");

            if (response.success && response.launchUrl && response.payment?.paymentId) {
                Alert.alert(
                    "Continue in Browser",
                    "eSewa will open in your browser or eSewa app. After completing the payment, return to Rentivo.",
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
                                    await checkEsewaBrowserPaymentResult(response.payment.paymentId);
                                }
                            },
                        },
                    ]
                );
            } else {
                Alert.alert("Error", "Failed to initialize payment");
            }
        } catch (error) {
            Alert.alert("Error", error.message || "Failed to initiate payment");
        } finally {
            setProcessing(false);
        }
    };

    const handleKhaltiPayment = async () => {
        try {
            setProcessing(true);
            handledGatewayResultRef.current = false;
            const response = await initiatePayment(invoiceId, "khalti");

            if (response.success && response.gatewayData) {
                setPaymentData(response.gatewayData);
                setSelectedGateway("khalti");
                setPaymentInitiated(true);
            } else {
                Alert.alert("Error", "Failed to initialize payment");
            }
        } catch (error) {
            Alert.alert("Error", error.message || "Failed to initiate payment");
        } finally {
            setProcessing(false);
        }
    };

    const syncSuccessfulPaymentState = async (targetInvoiceId) => {
        const invoiceToRefresh = targetInvoiceId || invoiceId;
        let latestInvoice = null;

        for (let attempt = 0; attempt < 5; attempt++) {
            const data = await getInvoiceById(invoiceToRefresh);
            latestInvoice = data.invoice;
            setInvoice(data.invoice);

            if (data.invoice?.status === "Paid") {
                break;
            }

            await sleep(1000);
        }

        if (latestInvoice?.status !== "Paid") {
            throw new Error("Invoice status is still pending after payment verification");
        }

        await Promise.allSettled([fetchInvoices(), fetchNotifications()]);
    };

    const checkEsewaBrowserPaymentResult = async (paymentId) => {
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
                            onPress: () => {
                                handledGatewayResultRef.current = false;
                            },
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
            Alert.alert(
                "Payment Processing",
                "Your payment is being processed. Please check your invoices again in a moment.",
                [{ text: "OK", onPress: () => router.replace("/tenant/invoices") }]
            );
        } finally {
            setProcessing(false);
        }
    };

    const handleSuccessfulGatewayReturn = async (url) => {
        setPaymentInitiated(false);
        setProcessing(true);

        try {
            await syncSuccessfulPaymentState(getInvoiceIdFromUrl(url));

            Alert.alert(
                "Payment Successful",
                "Your payment has been processed successfully and the invoice is now marked as Paid.",
                [
                    {
                        text: "OK",
                        onPress: () => {
                            router.replace("/tenant/invoices");
                        },
                    },
                ]
            );
        } catch (_error) {
            Alert.alert(
                "Payment Successful",
                "Your payment was confirmed, but the latest status is still syncing. Please reopen your invoices in a moment.",
                [
                    {
                        text: "OK",
                        onPress: () => {
                            router.replace("/tenant/invoices");
                        },
                    },
                ]
            );
        } finally {
            setProcessing(false);
        }
    };

    const handleGatewayResult = (url) => {
        if (handledGatewayResultRef.current) return;
        handledGatewayResultRef.current = true;

        if (url.includes("/payment-success")) {
            void handleSuccessfulGatewayReturn(url);
        } else {
            const failureMeta = getFailureMetaFromUrl(url);
            setPaymentInitiated(false);
            if (failureMeta.title === "Payment Processing") {
                void Promise.allSettled([fetchInvoices(), fetchNotifications()]);
            }
            Alert.alert(failureMeta.title, failureMeta.message, [
                {
                    text: "OK",
                    onPress: () => {
                        handledGatewayResultRef.current = false;
                        if (failureMeta.title === "Payment Processing") {
                            router.replace("/tenant/invoices");
                            return;
                        }
                        setPaymentInitiated(false);
                    },
                },
            ]);
        }
    };

    /**
     * Intercept the gateway callback URL and hit it from React Native
     * directly. This bypasses ngrok's free-tier interstitial page which
     * blocks browser-initiated requests and prevents the backend from
     * ever receiving the payment verification callback.
     */
    const verifyPaymentDirectly = async (verifyUrl) => {
        if (handledGatewayResultRef.current) return;
        handledGatewayResultRef.current = true;

        setPaymentInitiated(false);
        setProcessing(true);

        try {
            // fetch from RN native networking (not WebView) — CORS and
            // ngrok interstitial do not apply.
            const response = await fetch(verifyUrl, {
                headers: { "ngrok-skip-browser-warning": "true" },
                redirect: "follow",
            });

            // After redirects, response.url is the final destination
            // e.g. https://host/payment-success?txn=...&invoice=...
            const finalUrl = response.url || "";

            if (finalUrl.includes("/payment-success")) {
                await syncSuccessfulPaymentState(getInvoiceIdFromUrl(finalUrl));
                Alert.alert(
                    "Payment Successful",
                    "Your payment has been processed successfully and the invoice is now marked as Paid.",
                    [{ text: "OK", onPress: () => router.replace("/tenant/invoices") }]
                );
            } else if (finalUrl.includes("/payment-failed")) {
                const failureMeta = getFailureMetaFromUrl(finalUrl);
                if (failureMeta.title === "Payment Processing") {
                    await Promise.allSettled([fetchInvoices(), fetchNotifications()]);
                }
                setProcessing(false);
                Alert.alert(failureMeta.title, failureMeta.message, [
                    {
                        text: "OK",
                        onPress: () => {
                            handledGatewayResultRef.current = false;
                            if (failureMeta.title === "Payment Processing") {
                                router.replace("/tenant/invoices");
                            }
                        },
                    },
                ]);
                return;
            } else {
                // Redirect URL not recognised — fall back to polling
                await syncSuccessfulPaymentState();
                Alert.alert(
                    "Payment Successful",
                    "Your payment has been processed successfully.",
                    [{ text: "OK", onPress: () => router.replace("/tenant/invoices") }]
                );
            }
        } catch (_error) {
            Alert.alert(
                "Payment Processing",
                "Your payment is being processed. Please check your invoices in a moment.",
                [{ text: "OK", onPress: () => router.replace("/tenant/invoices") }]
            );
        } finally {
            setProcessing(false);
        }
    };

    const handleWebViewNavigationStateChange = (navState) => {
        const { url } = navState;
        if (url.includes("/payment-success") || url.includes("/payment-failed")) {
            handleGatewayResult(url);
        }
    };

    const handleShouldStartLoadWithRequest = (request) => {
        const { url } = request;

        // Final result pages — handle directly
        if (url.includes("/payment-success") || url.includes("/payment-failed")) {
            handleGatewayResult(url);
            return false;
        }

        // Intercept verify / failure callbacks heading to our backend.
        // Make the request from RN so ngrok interstitial cannot block it.
        if (
            url.includes("/api/payments/esewa/verify") ||
            url.includes("/api/payments/khalti/verify") ||
            url.includes("/api/payments/failure")
        ) {
            void verifyPaymentDirectly(url);
            return false;
        }

        return true;
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

    if (paymentInitiated && paymentData) {
        let gatewayTitle = "Payment";
        let webViewSource = null;

        if (selectedGateway === "esewa") {
            gatewayTitle = "eSewa Payment";
        } else if (selectedGateway === "khalti") {
            gatewayTitle = "Khalti Payment";
            // Khalti e-Payment v2: directly load the payment_url returned by the API
            webViewSource = { uri: paymentData.payment_url };
        }

        if (selectedGateway === "esewa") {
            return null;
        }

        return (
            <View style={styles.container}>
                <TopBar
                    title={gatewayTitle}
                    showBack
                    onBackPress={() => {
                        Alert.alert(
                            "Cancel Payment",
                            "Are you sure you want to cancel this payment?",
                            [
                                { text: "No", style: "cancel" },
                                {
                                    text: "Yes",
                                    onPress: () => {
                                        handledGatewayResultRef.current = false;
                                        setPaymentInitiated(false);
                                    },
                                },
                            ]
                        );
                    }}
                />
                <WebView
                    ref={webViewRef}
                    source={webViewSource}
                    style={{ flex: 1 }}
                    onNavigationStateChange={handleWebViewNavigationStateChange}
                    onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    startInLoadingState={true}
                    renderLoading={() => (
                        <View style={styles.webViewLoading}>
                            <ActivityIndicator size="large" color={COLORS.primary} />
                        </View>
                    )}
                />
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
                        style={styles.paymentOption}
                        onPress={handleEsewaPayment}
                        disabled={processing}
                    >
                        <View style={styles.paymentOptionContent}>
                            <Ionicons name="wallet-outline" size={24} color="#2563EB" />
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={styles.paymentOptionTitle}>eSewa</Text>
                                <Text style={styles.paymentOptionSubtitle}>
                                    Pay securely using eSewa wallet
                                </Text>
                            </View>
                            {processing ? (
                                <ActivityIndicator size="small" color={COLORS.primary} />
                            ) : (
                                <Ionicons name="chevron-forward" size={20} color={COLORS.mutedForeground} />
                            )}
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.paymentOption, { marginTop: 12 }]}
                        onPress={handleKhaltiPayment}
                        disabled={processing}
                    >
                        <View style={styles.paymentOptionContent}>
                            <Ionicons name="wallet-outline" size={24} color="#5C2D91" />
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={styles.paymentOptionTitle}>Khalti</Text>
                                <Text style={styles.paymentOptionSubtitle}>
                                    Pay securely using Khalti wallet
                                </Text>
                            </View>
                            {processing ? (
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
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
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
        backgroundColor: COLORS.muted,
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        alignItems: "flex-start",
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: COLORS.mutedForeground,
        marginLeft: 8,
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
