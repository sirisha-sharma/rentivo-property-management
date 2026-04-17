import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../constants/theme";
import { SubscriptionStatusPill } from "./SubscriptionStatusPill";
import {
    formatDaysRemaining,
    formatCurrencyNpr,
    formatSubscriptionDate,
    getSubscriptionExpiryNotice,
    getSubscriptionOverviewMessage,
    getSubscriptionPlanLabel,
    isTrialSubscription,
} from "../utils/subscription";

export function SubscriptionSummaryCard({
    subscription,
    loading,
    onPress,
    buttonLabel = "Manage Plan",
}) {
    if (loading) {
        return (
            <View
                style={{
                    backgroundColor: COLORS.surface,
                    borderRadius: 22,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    padding: 22,
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 140,
                }}
            >
                <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
        );
    }

    if (!subscription) return null;

    const isTrial = isTrialSubscription(subscription);
    const usage = subscription.usage || {};
    const expiryNotice = getSubscriptionExpiryNotice(subscription);
    const noticePalette = expiryNotice
        ? expiryNotice.tone === "danger"
            ? {
                background: COLORS.destructiveSoft,
                border: "rgba(239,68,68,0.35)",
                iconBackground: "rgba(239,68,68,0.22)",
                icon: COLORS.destructive,
                title: COLORS.destructive,
                text: "rgba(248,113,113,0.92)",
            }
            : {
                background: COLORS.warningSoft,
                border: "rgba(245,158,11,0.35)",
                iconBackground: "rgba(245,158,11,0.22)",
                icon: COLORS.warning,
                title: COLORS.warning,
                text: "rgba(251,191,36,0.92)",
            }
        : null;

    return (
        <LinearGradient
            colors={[COLORS.surface, "#1C2236"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
                borderRadius: 24,
                borderWidth: 1,
                borderColor: COLORS.border,
                padding: 22,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.35,
                shadowRadius: 18,
                elevation: 6,
            }}
        >
            <View
                style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 16,
                }}
            >
                <View style={{ flex: 1, gap: 10 }}>
                    <View
                        style={{
                            width: 46,
                            height: 46,
                            borderRadius: 14,
                            backgroundColor: COLORS.accentTealSoft,
                            borderWidth: 1,
                            borderColor: "rgba(52,212,198,0.35)",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Ionicons name="ribbon-outline" size={22} color={COLORS.accentTealBright} />
                    </View>

                    <View style={{ gap: 4 }}>
                        <Text
                            style={{
                                fontSize: 11,
                                fontWeight: "700",
                                letterSpacing: 1.4,
                                color: COLORS.accentTealBright,
                                textTransform: "uppercase",
                            }}
                        >
                            Landlord Subscription
                        </Text>
                        <Text
                            style={{
                                fontSize: 24,
                                fontWeight: "700",
                                color: COLORS.foreground,
                                letterSpacing: -0.4,
                            }}
                        >
                            {getSubscriptionPlanLabel(subscription.plan)} Plan
                        </Text>
                    </View>
                </View>

                <SubscriptionStatusPill status={subscription.status} />
            </View>

            <Text
                style={{
                    marginTop: 14,
                    fontSize: 14,
                    lineHeight: 21,
                    color: COLORS.mutedForeground,
                }}
            >
                {getSubscriptionOverviewMessage(subscription)}
            </Text>

            {expiryNotice ? (
                <View
                    style={{
                        marginTop: 16,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: noticePalette.border,
                        backgroundColor: noticePalette.background,
                        padding: 15,
                        gap: 10,
                    }}
                >
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "flex-start",
                            gap: 12,
                        }}
                    >
                        <View
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 12,
                                backgroundColor: noticePalette.iconBackground,
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Ionicons
                                name={
                                    expiryNotice.tone === "danger"
                                        ? "alert-circle-outline"
                                        : "time-outline"
                                }
                                size={18}
                                color={noticePalette.icon}
                            />
                        </View>

                        <View style={{ flex: 1, gap: 4 }}>
                            <Text
                                style={{
                                    fontSize: 14,
                                    fontWeight: "700",
                                    color: noticePalette.title,
                                }}
                            >
                                {expiryNotice.title}
                            </Text>
                            <Text
                                style={{
                                    fontSize: 13,
                                    lineHeight: 19,
                                    color: noticePalette.text,
                                }}
                            >
                                {expiryNotice.message}
                            </Text>
                        </View>
                    </View>

                    {subscription.daysRemaining > 0 ? (
                        <Text
                            style={{
                                fontSize: 12,
                                fontWeight: "700",
                                color: noticePalette.title,
                                letterSpacing: 0.3,
                            }}
                        >
                            {formatDaysRemaining(subscription.daysRemaining)} remaining
                        </Text>
                    ) : null}
                </View>
            ) : null}

            <View
                style={{
                    flexDirection: "row",
                    gap: 10,
                    marginTop: 16,
                }}
            >
                <View
                    style={{
                        flex: 1,
                        backgroundColor: COLORS.surfaceElevated,
                        borderRadius: 14,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: COLORS.border,
                    }}
                >
                    <Text
                        style={{
                            fontSize: 11,
                            color: COLORS.mutedForeground,
                            marginBottom: 6,
                            textTransform: "uppercase",
                            letterSpacing: 0.6,
                            fontWeight: "600",
                        }}
                    >
                        Valid Until
                    </Text>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: COLORS.foreground }}>
                        {formatSubscriptionDate(subscription.endDate)}
                    </Text>
                </View>

                <View
                    style={{
                        flex: 1,
                        backgroundColor: COLORS.surfaceElevated,
                        borderRadius: 14,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: COLORS.border,
                    }}
                >
                    <Text
                        style={{
                            fontSize: 11,
                            color: COLORS.mutedForeground,
                            marginBottom: 6,
                            textTransform: "uppercase",
                            letterSpacing: 0.6,
                            fontWeight: "600",
                        }}
                    >
                        Payment Status
                    </Text>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: COLORS.foreground }}>
                        {subscription.paymentStatus === "paid"
                            ? "Paid"
                            : subscription.paymentStatus === "pending"
                                ? "Pending"
                                : isTrial
                                    ? "Not Required"
                                    : subscription.paymentStatus || "N/A"}
                    </Text>
                </View>
            </View>

            {isTrial ? (
                <View
                    style={{
                        backgroundColor: COLORS.surfaceElevated,
                        borderRadius: 16,
                        padding: 16,
                        marginTop: 16,
                        borderWidth: 1,
                        borderColor: COLORS.border,
                        gap: 8,
                    }}
                >
                    <Text
                        style={{
                            fontSize: 12,
                            fontWeight: "700",
                            color: COLORS.accentLilac,
                            textTransform: "uppercase",
                            letterSpacing: 0.8,
                        }}
                    >
                        Trial Usage
                    </Text>
                    <Text style={{ fontSize: 13, color: COLORS.mutedForeground }}>
                        {usage.propertyCount || 0}/{subscription?.limits?.properties || 1} properties used
                    </Text>
                    <Text style={{ fontSize: 13, color: COLORS.mutedForeground }}>
                        {usage.managedTenantCount || 0}/{subscription?.limits?.tenantSeats || 1} tenant seats used
                    </Text>
                </View>
            ) : null}

            {subscription.plan !== "trial" ? (
                <View
                    style={{
                        backgroundColor: COLORS.surfaceElevated,
                        borderRadius: 16,
                        padding: 16,
                        marginTop: 16,
                        borderWidth: 1,
                        borderColor: COLORS.border,
                        gap: 6,
                    }}
                >
                    <Text
                        style={{
                            fontSize: 12,
                            fontWeight: "700",
                            color: COLORS.accentTealBright,
                            textTransform: "uppercase",
                            letterSpacing: 0.8,
                        }}
                    >
                        Full Access
                    </Text>
                    <Text style={{ fontSize: 13, color: COLORS.mutedForeground, lineHeight: 19 }}>
                        Your paid subscription unlocks unlimited property and tenant management.
                    </Text>
                    {subscription.amount ? (
                        <Text style={{ fontSize: 13, color: COLORS.mutedForeground }}>
                            Current charge: {formatCurrencyNpr(subscription.amount)}
                        </Text>
                    ) : null}
                </View>
            ) : null}

            {onPress ? (
                <TouchableOpacity
                    onPress={onPress}
                    activeOpacity={0.85}
                    style={{
                        marginTop: 18,
                        backgroundColor: COLORS.primary,
                        borderRadius: 14,
                        paddingVertical: 14,
                        alignItems: "center",
                        justifyContent: "center",
                        shadowColor: COLORS.primary,
                        shadowOffset: { width: 0, height: 6 },
                        shadowOpacity: 0.4,
                        shadowRadius: 14,
                        elevation: 4,
                    }}
                >
                    <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700", letterSpacing: 0.3 }}>
                        {buttonLabel}
                    </Text>
                </TouchableOpacity>
            ) : null}
        </LinearGradient>
    );
}
