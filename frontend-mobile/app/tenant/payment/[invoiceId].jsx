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
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { TopBar } from "../../../components/TopBar";
import { COLORS } from "../../../constants/theme";
import { initiatePayment } from "../../../api/payment";
import { getInvoiceById } from "../../../api/invoice";
import { InvoiceContext } from "../../../context/InvoiceContext";

export default function PaymentScreen() {
    const { invoiceId } = useLocalSearchParams();
    const router = useRouter();
    const webViewRef = useRef(null);
    const { fetchInvoices } = useContext(InvoiceContext);

    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [paymentInitiated, setPaymentInitiated] = useState(false);
    const [paymentData, setPaymentData] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [selectedGateway, setSelectedGateway] = useState(null);

    useEffect(() => {
        fetchInvoiceDetails();
    }, [invoiceId]);

    const fetchInvoiceDetails = async () => {
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
    };

    const handleEsewaPayment = async () => {
        try {
            setProcessing(true);
            const response = await initiatePayment(invoiceId, "esewa");

            if (response.success && response.gatewayData) {
                setPaymentData(response.gatewayData);
                setSelectedGateway("esewa");
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

    const handleKhaltiPayment = async () => {
        try {
            setProcessing(true);
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

    const generateEsewaFormHTML = () => {
        if (!paymentData) return "";

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body {
                        margin: 0;
                        padding: 20px;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        background: #f5f5f5;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                    }
                    .container {
                        background: white;
                        padding: 30px;
                        border-radius: 12px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                        text-align: center;
                    }
                    .logo {
                        font-size: 24px;
                        font-weight: bold;
                        color: #2563EB;
                        margin-bottom: 20px;
                    }
                    .message {
                        color: #64748B;
                        margin-bottom: 20px;
                    }
                    .loader {
                        border: 3px solid #f3f3f3;
                        border-top: 3px solid #2563EB;
                        border-radius: 50%;
                        width: 40px;
                        height: 40px;
                        animation: spin 1s linear infinite;
                        margin: 20px auto;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="logo">eSewa Payment</div>
                    <div class="message">Redirecting to eSewa...</div>
                    <div class="loader"></div>
                </div>
                <form id="esewaForm" action="${paymentData.payment_url}" method="POST">
                    <input type="hidden" name="amount" value="${paymentData.amount}" />
                    <input type="hidden" name="tax_amount" value="${paymentData.tax_amount || 0}" />
                    <input type="hidden" name="total_amount" value="${paymentData.total_amount}" />
                    <input type="hidden" name="transaction_uuid" value="${paymentData.transaction_uuid}" />
                    <input type="hidden" name="product_code" value="${paymentData.product_code}" />
                    <input type="hidden" name="product_service_charge" value="${paymentData.product_service_charge || 0}" />
                    <input type="hidden" name="product_delivery_charge" value="${paymentData.product_delivery_charge || 0}" />
                    <input type="hidden" name="success_url" value="${paymentData.success_url}" />
                    <input type="hidden" name="failure_url" value="${paymentData.failure_url}" />
                    <input type="hidden" name="signed_field_names" value="${paymentData.signed_field_names}" />
                    <input type="hidden" name="signature" value="${paymentData.signature}" />
                </form>
                <script>
                    setTimeout(function() {
                        document.getElementById('esewaForm').submit();
                    }, 1000);
                </script>
            </body>
            </html>
        `;
    };

    const handleWebViewNavigationStateChange = (navState) => {
        const { url } = navState;

        // Check if returned from payment gateway
        if (url.includes("/payment-success") || url.includes("/payment-failed")) {
            setPaymentInitiated(false);

            if (url.includes("/payment-success")) {
                // Refresh invoices to show updated status
                fetchInvoices();

                Alert.alert(
                    "Payment Successful",
                    "Your payment has been processed successfully! Invoice status will update shortly.",
                    [
                        {
                            text: "OK",
                            onPress: () => {
                                // Navigate back to invoices
                                router.replace("/tenant/invoices");
                            },
                        },
                    ]
                );
            } else {
                Alert.alert(
                    "Payment Failed",
                    "Your payment could not be processed. Please try again.",
                    [
                        {
                            text: "OK",
                            onPress: () => setPaymentInitiated(false),
                        },
                    ]
                );
            }
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

    if (paymentInitiated && paymentData) {
        let gatewayTitle = "Payment";
        let formHTML = "";
        let webViewSource = null;

        if (selectedGateway === "esewa") {
            gatewayTitle = "eSewa Payment";
            formHTML = generateEsewaFormHTML();
            webViewSource = { html: formHTML };
        } else if (selectedGateway === "khalti") {
            gatewayTitle = "Khalti Payment";
            // Khalti e-Payment v2: directly load the payment_url returned by the API
            webViewSource = { uri: paymentData.payment_url };
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
                                    onPress: () => setPaymentInitiated(false),
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
