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
            background: COLORS.primarySoft,
            border: "rgba(47,123,255,0.35)",
            iconBg: "rgba(47,123,255,0.22)",
            icon: COLORS.primary,
            title: COLORS.foreground,
            text: COLORS.mutedForeground,
            button: COLORS.primary,
        },
        warning: {
            background: COLORS.warningSoft,
            border: "rgba(245,158,11,0.35)",
            iconBg: "rgba(245,158,11,0.22)",
            icon: COLORS.warning,
            title: COLORS.foreground,
            text: COLORS.mutedForeground,
            button: COLORS.primary,
        },
        danger: {
            background: COLORS.destructiveSoft,
            border: "rgba(239,68,68,0.35)",
            iconBg: "rgba(239,68,68,0.22)",
            icon: COLORS.destructive,
            title: COLORS.foreground,
            text: COLORS.mutedForeground,
            button: COLORS.destructive,
        },
    }[tone] || {
        background: COLORS.muted,
        border: COLORS.border,
        iconBg: COLORS.surface,
        icon: COLORS.primary,
        title: COLORS.foreground,
        text: COLORS.mutedForeground,
        button: COLORS.primary,
    };

    return (
        <View
            style={{
                backgroundColor: palette.background,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: palette.border,
                padding: 16,
                gap: 12,
            }}
        >
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                <View
                    style={{
                        width: 40,
                        height: 40,
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
                        backgroundColor: palette.button,
                        borderRadius: 12,
                        paddingHorizontal: 16,
                        paddingVertical: 11,
                        shadowColor: palette.button,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.35,
                        shadowRadius: 10,
                        elevation: 3,
                    }}
                >
                    <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700", letterSpacing: 0.2 }}>
                        {actionLabel}
                    </Text>
                </TouchableOpacity>
            ) : null}
        </View>
    );
}
