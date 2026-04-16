import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
                    backgroundColor: "#fff",
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    padding: 20,
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 140,
                }}
            >
                <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
        );
    }

    if (!subscription) {
        return null;
    }

    const isTrial = isTrialSubscription(subscription);
    const usage = subscription.usage || {};
    const expiryNotice = getSubscriptionExpiryNotice(subscription);
    const noticePalette = expiryNotice
        ? expiryNotice.tone === "danger"
            ? {
                background: "#FEF2F2",
                border: "#FECACA",
                iconBackground: "#FEE2E2",
                icon: "#B91C1C",
                title: "#B91C1C",
                text: "#991B1B",
            }
            : {
                background: "#FFFBEB",
                border: "#FDE68A",
                iconBackground: "#FEF3C7",
                icon: "#D97706",
                title: "#92400E",
                text: "#92400E",
            }
        : null;

    return (
        <View
            style={{
                backgroundColor: "#fff",
                borderRadius: 20,
                borderWidth: 1,
                borderColor: COLORS.border,
                padding: 20,
                shadowColor: "#0F172A",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 10,
                elevation: 2,
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
                <View style={{ flex: 1, gap: 8 }}>
                    <View
                        style={{
                            width: 42,
                            height: 42,
                            borderRadius: 14,
                            backgroundColor: "#F0FDFA",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Ionicons name="sparkles-outline" size={20} color="#0F766E" />
                    </View>

                    <View style={{ gap: 4 }}>
                        <Text
                            style={{
                                fontSize: 12,
                                fontWeight: "700",
                                letterSpacing: 1.2,
                                color: "#0F766E",
                                textTransform: "uppercase",
                            }}
                        >
                            Landlord Subscription
                        </Text>
                        <Text
                            style={{
                                fontSize: 22,
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
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                    gap: 12,
                    marginTop: 16,
                }}
            >
                <View
                    style={{
                        width: "48%",
                        backgroundColor: COLORS.muted,
                        borderRadius: 14,
                        padding: 14,
                    }}
                >
                    <Text style={{ fontSize: 11, color: COLORS.mutedForeground, marginBottom: 4 }}>
                        Valid Until
                    </Text>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: COLORS.foreground }}>
                        {formatSubscriptionDate(subscription.endDate)}
                    </Text>
                </View>

                <View
                    style={{
                        width: "48%",
                        backgroundColor: COLORS.muted,
                        borderRadius: 14,
                        padding: 14,
                    }}
                >
                    <Text style={{ fontSize: 11, color: COLORS.mutedForeground, marginBottom: 4 }}>
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
                        backgroundColor: "#F8FAFC",
                        borderRadius: 16,
                        padding: 16,
                        marginTop: 16,
                        gap: 10,
                    }}
                >
                    <Text style={{ fontSize: 13, fontWeight: "700", color: COLORS.foreground }}>
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
                        backgroundColor: "#F8FAFC",
                        borderRadius: 16,
                        padding: 16,
                        marginTop: 16,
                        gap: 6,
                    }}
                >
                    <Text style={{ fontSize: 13, fontWeight: "700", color: COLORS.foreground }}>
                        Full Access
                    </Text>
                    <Text style={{ fontSize: 13, color: COLORS.mutedForeground }}>
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
                        backgroundColor: COLORS.foreground,
                        borderRadius: 14,
                        paddingVertical: 13,
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>
                        {buttonLabel}
                    </Text>
                </TouchableOpacity>
            ) : null}
        </View>
    );
}
