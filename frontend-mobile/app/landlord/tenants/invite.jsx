import React, { useState, useContext } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, Platform } from "react-native";
import { TenantContext } from "../../../context/TenantContext";
import { PropertyContext } from "../../../context/PropertyContext";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { TopBar } from "../../../components/TopBar";
import { SubscriptionGateBanner } from "../../../components/SubscriptionGateBanner";
import { COLORS } from "../../../constants/theme";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { SubscriptionContext } from "../../../context/SubscriptionContext";
import {
    SUBSCRIPTION_ACTIONS,
    getSubscriptionActionAccess,
    getSubscriptionActionPrompt,
    getSubscriptionErrorPayload,
    isSubscriptionErrorPayload,
} from "../../../utils/subscription";

export default function InviteTenant() {
    const [email, setEmail] = useState("");
    const [selectedProperty, setSelectedProperty] = useState("");
    const [leaseStart, setLeaseStart] = useState(new Date());
    const [leaseEnd, setLeaseEnd] = useState(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)); // 1 year from now
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    const { inviteTenant, loading: tenantLoading } = useContext(TenantContext);
    const { properties, fetchProperties, loading: propertyLoading } = useContext(PropertyContext);
    const { subscription, fetchSubscription } = useContext(SubscriptionContext);
    const router = useRouter();

    useFocusEffect(
        React.useCallback(() => {
            void fetchProperties();
            void fetchSubscription();
        }, [fetchProperties, fetchSubscription])
    );

    const canInviteTenant = getSubscriptionActionAccess(
        subscription,
        SUBSCRIPTION_ACTIONS.INVITE_TENANT
    );
    const actionPrompt = getSubscriptionActionPrompt({
        subscription,
        action: SUBSCRIPTION_ACTIONS.INVITE_TENANT,
    });
    const shouldShowBanner = Boolean(
        subscription &&
        (subscription.plan === "trial" ||
            !canInviteTenant ||
            ["expired", "cancelled", "pending_payment"].includes(subscription.status))
    );

    const handleStartChange = (event, selectedDate) => {
        setShowStartPicker(Platform.OS === "ios");
        if (selectedDate) {
            setLeaseStart(selectedDate);
        }
    };

    const handleEndChange = (event, selectedDate) => {
        setShowEndPicker(Platform.OS === "ios");
        if (selectedDate) {
            setLeaseEnd(selectedDate);
        }
    };

    const formatDate = (date) => {
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const handleInvite = async () => {
        if (!canInviteTenant) {
            Alert.alert(actionPrompt.title, actionPrompt.message, [
                { text: "Cancel", style: "cancel" },
                {
                    text: actionPrompt.cta,
                    onPress: () => router.push("/landlord/subscription"),
                },
            ]);
            return;
        }

        if (!email || !selectedProperty) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }

        if (leaseEnd <= leaseStart) {
            Alert.alert("Error", "Lease end date must be after start date");
            return;
        }

        try {
            await inviteTenant({
                email,
                propertyId: selectedProperty,
                leaseStart: leaseStart.toISOString(),
                leaseEnd: leaseEnd.toISOString()
            });
            Alert.alert("Success", "Tenant invited successfully", [
                { text: "OK", onPress: () => router.back() }
            ]);

        } catch (error) {
            const payload = getSubscriptionErrorPayload(error);
            if (isSubscriptionErrorPayload(payload)) {
                Alert.alert(actionPrompt.title, payload.message || actionPrompt.message, [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "View Plans",
                        onPress: () => router.push("/landlord/subscription"),
                    },
                ]);
                return;
            }

            Alert.alert("Error", payload?.message || "Failed to invite tenant");
        }
    };

    return (
        <View style={styles.container}>
            <TopBar title="Invite Tenant" showBack />

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.introCard}>
                    <View style={styles.introIcon}>
                        <Ionicons name="mail-open-outline" size={20} color={COLORS.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.introTitle}>Invite a tenant with confidence</Text>
                        <Text style={styles.introText}>
                            Select the property, set the lease dates, and Rentivo will handle the invitation flow.
                        </Text>
                    </View>
                </View>

                {shouldShowBanner ? (
                    <SubscriptionGateBanner
                        title={actionPrompt.title}
                        message={actionPrompt.message}
                        actionLabel={actionPrompt.cta}
                        onActionPress={() => router.push("/landlord/subscription")}
                        tone={canInviteTenant ? "info" : "warning"}
                    />
                ) : null}

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Tenant Email</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="tenant@example.com"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        placeholderTextColor={COLORS.mutedForeground}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Select Property</Text>
                    {propertyLoading ? (
                        <ActivityIndicator color={COLORS.primary} />
                    ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.propertyList}>
                            {properties.map((prop) => (
                                <TouchableOpacity
                                    key={prop._id}
                                    style={[
                                        styles.propertyChip,
                                        selectedProperty === prop._id && styles.propertyChipActive
                                    ]}
                                    onPress={() => setSelectedProperty(prop._id)}
                                >
                                    <Text style={[
                                        styles.propertyText,
                                        selectedProperty === prop._id && styles.propertyTextActive
                                    ]}>{prop.title}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}
                </View>

                <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.label}>Lease Start</Text>
                        <TouchableOpacity
                            style={styles.dateButton}
                            onPress={() => setShowStartPicker(true)}
                        >
                            <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
                            <Text style={styles.dateText}>{formatDate(leaseStart)}</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.label}>Lease End</Text>
                        <TouchableOpacity
                            style={styles.dateButton}
                            onPress={() => setShowEndPicker(true)}
                        >
                            <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
                            <Text style={styles.dateText}>{formatDate(leaseEnd)}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {showStartPicker && (
                    <DateTimePicker
                        value={leaseStart}
                        mode="date"
                        display={Platform.OS === "ios" ? "inline" : "default"}
                        onChange={handleStartChange}
                        minimumDate={new Date()}
                    />
                )}

                {showEndPicker && (
                    <DateTimePicker
                        value={leaseEnd}
                        mode="date"
                        display={Platform.OS === "ios" ? "inline" : "default"}
                        onChange={handleEndChange}
                        minimumDate={leaseStart}
                    />
                )}

                <TouchableOpacity style={styles.submitButton} onPress={handleInvite} disabled={tenantLoading}>
                    {tenantLoading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.submitButtonText}>
                            {canInviteTenant ? "Send Invitation" : "Upgrade to Continue"}
                        </Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        padding: 16,
        gap: 16,
    },
    introCard: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 14,
        backgroundColor: COLORS.surface,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 16,
    },
    introIcon: {
        width: 42,
        height: 42,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.primarySoft,
        borderWidth: 1,
        borderColor: "rgba(47,123,255,0.22)",
    },
    introTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.foreground,
    },
    introText: {
        marginTop: 4,
        fontSize: 13,
        lineHeight: 20,
        color: COLORS.mutedForeground,
    },
    inputGroup: {
        gap: 8,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    label: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.foreground,
    },
    input: {
        height: 48,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        paddingHorizontal: 16,
        fontSize: 16,
        backgroundColor: COLORS.input,
        color: COLORS.foreground,
    },
    dateButton: {
        height: 48,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        paddingHorizontal: 16,
        backgroundColor: COLORS.input,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    dateText: {
        fontSize: 16,
        color: COLORS.foreground,
    },
    propertyList: {
        gap: 8,
    },
    propertyChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: COLORS.muted,
        borderWidth: 1,
        borderColor: "transparent",
    },
    propertyChipActive: {
        backgroundColor: COLORS.card,
        borderColor: COLORS.primary,
    },
    propertyText: {
        fontSize: 14,
        color: COLORS.mutedForeground,
    },
    propertyTextActive: {
        color: COLORS.primary,
        fontWeight: "600",
    },
    submitButton: {
        backgroundColor: COLORS.primary,
        height: 48,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 8,
    },
    submitButtonText: {
        color: "white",
        fontWeight: "bold",
        fontSize: 16,
    },
});
