import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";

export function SubscriptionGateBanner({
    title,
    message,
    actionLabel,
    onActionPress,
    tone = "warning",
}) {
    const palette = {
        info: {
            background: "#EFF6FF",
            border: "#BFDBFE",
            iconBg: "#DBEAFE",
            icon: COLORS.primary,
            title: "#1D4ED8",
            text: "#1E3A8A",
        },
        warning: {
            background: "#FFFBEB",
            border: "#FDE68A",
            iconBg: "#FEF3C7",
            icon: COLORS.warning,
            title: "#92400E",
            text: "#92400E",
        },
        danger: {
            background: "#FEF2F2",
            border: "#FECACA",
            iconBg: "#FEE2E2",
            icon: COLORS.destructive,
            title: "#B91C1C",
            text: "#991B1B",
        },
    }[tone] || {
        background: COLORS.muted,
        border: COLORS.border,
        iconBg: COLORS.background,
        icon: COLORS.primary,
        title: COLORS.foreground,
        text: COLORS.mutedForeground,
    };

    return (
        <View
            style={{
                backgroundColor: palette.background,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: palette.border,
                padding: 16,
                gap: 12,
            }}
        >
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                <View
                    style={{
                        width: 38,
                        height: 38,
                        borderRadius: 12,
                        backgroundColor: palette.iconBg,
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Ionicons name="sparkles-outline" size={18} color={palette.icon} />
                </View>

                <View style={{ flex: 1, gap: 4 }}>
                    <Text
                        style={{
                            fontSize: 15,
                            fontWeight: "700",
                            color: palette.title,
                            letterSpacing: -0.1,
                        }}
                    >
                        {title}
                    </Text>
                    <Text
                        style={{
                            fontSize: 13,
                            lineHeight: 19,
                            color: palette.text,
                        }}
                    >
                        {message}
                    </Text>
                </View>
            </View>

            {actionLabel && onActionPress ? (
                <TouchableOpacity
                    onPress={onActionPress}
                    activeOpacity={0.85}
                    style={{
                        alignSelf: "flex-start",
                        backgroundColor: COLORS.foreground,
                        borderRadius: 10,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                    }}
                >
                    <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>
                        {actionLabel}
                    </Text>
                </TouchableOpacity>
            ) : null}
        </View>
    );
}
