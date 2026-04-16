import React from "react";
import { View, Text } from "react-native";
import { COLORS } from "../constants/theme";
import { getSubscriptionStatusLabel, getSubscriptionStatusTone } from "../utils/subscription";

const TONE_STYLES = {
    success: { bg: "#DCFCE7", text: "#166534" },
    info: { bg: "#DBEAFE", text: "#1D4ED8" },
    warning: { bg: "#FEF3C7", text: "#92400E" },
    danger: { bg: "#FEE2E2", text: "#B91C1C" },
    muted: { bg: COLORS.muted, text: COLORS.mutedForeground },
};

export function SubscriptionStatusPill({ status }) {
    const tone = getSubscriptionStatusTone(status);
    const colors = TONE_STYLES[tone] || TONE_STYLES.muted;

    return (
        <View
            style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 999,
                backgroundColor: colors.bg,
                alignSelf: "flex-start",
            }}
        >
            <Text
                style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: colors.text,
                    textTransform: "uppercase",
                    letterSpacing: 0.4,
                }}
            >
                {getSubscriptionStatusLabel(status)}
            </Text>
        </View>
    );
}
