import React, { useState, useContext, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from "react-native";
import { TenantContext } from "../../../context/TenantContext";
import { PropertyContext } from "../../../context/PropertyContext";
import { useRouter } from "expo-router";
import { TopBar } from "../../../components/TopBar";
import { COLORS } from "../../../constants/theme";

export default function InviteTenant() {
    const [email, setEmail] = useState("");
    const [selectedProperty, setSelectedProperty] = useState("");
    const [leaseStart, setLeaseStart] = useState("");
    const [leaseEnd, setLeaseEnd] = useState("");

    const { inviteTenant, loading: tenantLoading } = useContext(TenantContext);
    const { properties, fetchProperties, loading: propertyLoading } = useContext(PropertyContext);
    const router = useRouter();

    useEffect(() => {
        fetchProperties();
    }, []);

    const handleInvite = async () => {
        if (!email || !selectedProperty || !leaseStart || !leaseEnd) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }

        try {
            await inviteTenant({
                email,
                propertyId: selectedProperty,
                leaseStart,
                leaseEnd
            });
            Alert.alert("Success", "Tenant invited successfully", [
                { text: "OK", onPress: () => router.back() }
            ]);

        } catch (e) {
            Alert.alert("Error", "Failed to invite tenant");
        }
    };

    return (
        <View style={styles.container}>
            <TopBar title="Invite Tenant" showBack />

            <ScrollView contentContainerStyle={styles.content}>
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
                        <TextInput
                            style={styles.input}
                            placeholder="YYYY-MM-DD"
                            value={leaseStart}
                            onChangeText={setLeaseStart}
                            placeholderTextColor={COLORS.mutedForeground}
                        />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.label}>Lease End</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="YYYY-MM-DD"
                            value={leaseEnd}
                            onChangeText={setLeaseEnd}
                            placeholderTextColor={COLORS.mutedForeground}
                        />
                    </View>
                </View>

                <TouchableOpacity style={styles.submitButton} onPress={handleInvite} disabled={tenantLoading}>
                    {tenantLoading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.submitButtonText}>Send Invitation</Text>
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
