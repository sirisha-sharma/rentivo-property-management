import React from "react";
import { View, Text } from "react-native";
import { COLORS } from "../constants/theme";
import { getSubscriptionStatusLabel, getSubscriptionStatusTone } from "../utils/subscription";

// Reusable UI component for subscriptionstatuspill.

const TONE_STYLES = {
    success: { bg: COLORS.successSoft, text: COLORS.success },
    info: { bg: COLORS.infoSoft, text: COLORS.info },
    warning: { bg: COLORS.warningSoft, text: COLORS.warning },
    danger: { bg: COLORS.destructiveSoft, text: COLORS.destructive },
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
                    fontSize: 11,
                    fontWeight: "700",
                    color: colors.text,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                }}
            >
                {getSubscriptionStatusLabel(status)}
            </Text>
        </View>
    );
}
