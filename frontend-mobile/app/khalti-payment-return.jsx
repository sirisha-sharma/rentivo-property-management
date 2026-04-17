import React, { useEffect } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { COLORS } from "../constants/theme";

// Screen module for khalti payment return.

export default function KhaltiPaymentReturnScreen() {
    const router = useRouter();
    const {
        invoice,
        paymentId,
        result,
        reason,
        status,
    } = useLocalSearchParams();

    useEffect(() => {
        if (invoice) {
            router.replace({
                pathname: "/tenant/payment/[invoiceId]",
                params: {
                    invoiceId: invoice,
                    khaltiReturn: "1",
                    paymentId,
                    result,
                    reason,
                    status,
                },
            });
            return;
        }

        router.replace("/tenant/invoices");
    }, [invoice, paymentId, reason, result, router, status]);

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.text}>Returning to Rentivo...</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.background,
        gap: 12,
        padding: 24,
    },
    text: {
        fontSize: 14,
        color: COLORS.mutedForeground,
    },
});
