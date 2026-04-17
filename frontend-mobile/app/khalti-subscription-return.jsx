import React, { useEffect } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { COLORS } from "../constants/theme";

export default function KhaltiSubscriptionReturnScreen() {
    const router = useRouter();
    const { paymentId, result, reason, status } = useLocalSearchParams();

    useEffect(() => {
        router.replace({
            pathname: "/landlord/subscription",
            params: {
                khaltiReturn: "1",
                paymentId,
                result,
                reason,
                status,
            },
        });
    }, [paymentId, reason, result, router, status]);

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
