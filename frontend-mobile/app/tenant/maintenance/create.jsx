import React, { useContext, useEffect, useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { TopBar } from "../../../components/TopBar";
import { MaintenanceContext } from "../../../context/MaintenanceContext";
import { PropertyContext } from "../../../context/PropertyContext";
import { COLORS } from "../../../constants/theme";

// Tenant Create Maintenance Request Screen
// Allows tenants to submit a new maintenance request for their rented property
export default function CreateMaintenanceRequest() {
    const router = useRouter();
    const { createRequest, loading } = useContext(MaintenanceContext);
    const { properties, fetchProperties } = useContext(PropertyContext);

    const [selectedPropertyId, setSelectedPropertyId] = useState("");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState("Medium");

    const formatUrgencyLabel = (value) => `${value} Urgency`;

    // Fetch properties when screen loads
    useEffect(() => {
        fetchProperties();
    }, [fetchProperties]);

    // Handle form submission
    const handleSubmit = async () => {
        if (!selectedPropertyId || !title) {
            Alert.alert("Error", "Please fill in all required fields");
            return;
        }

        try {
            await createRequest({
                propertyId: selectedPropertyId,
                title,
                description,
                urgency: priority,
            });
            Alert.alert("Success", "Maintenance request submitted successfully", [
                { text: "OK", onPress: () => router.back() },
            ]);
        } catch (_err) {
            Alert.alert("Error", "Failed to submit maintenance request");
        }
    };

    // Urgency options for the request
    const priorities = ["Low", "Medium", "High"];

    return (
        <View style={styles.container}>
            <TopBar title="New Request" showBack />

            <ScrollView contentContainerStyle={styles.form}>
                {/* Property Selection */}
                <Text style={styles.label}>Property *</Text>
                <View style={styles.pickerContainer}>
                    {properties.map((prop) => (
                        <TouchableOpacity
                            key={prop._id}
                            style={[
                                styles.selectOption,
                                selectedPropertyId === prop._id && styles.selectOptionActive,
                            ]}
                            onPress={() => setSelectedPropertyId(prop._id)}
                        >
                            <Text
                                style={[
                                    styles.selectOptionText,
                                    selectedPropertyId === prop._id && styles.selectOptionTextActive,
                                ]}
                            >
                                {prop.title}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Title */}
                <Text style={styles.label}>Title *</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g. Leaking faucet in kitchen"
                    value={title}
                    onChangeText={setTitle}
                    placeholderTextColor={COLORS.mutedForeground}
                />

                {/* Urgency */}
                <Text style={styles.label}>Urgency *</Text>
                <View style={styles.typeRow}>
                    {priorities.map((p) => (
                        <TouchableOpacity
                            key={p}
                            style={[styles.typeChip, priority === p && styles.typeChipActive]}
                            onPress={() => setPriority(p)}
                        >
                            <Text style={[styles.typeChipText, priority === p && styles.typeChipTextActive]}>
                                {formatUrgencyLabel(p)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Description */}
                <Text style={styles.label}>Description (Optional)</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Describe the issue in detail..."
                    multiline
                    numberOfLines={4}
                    value={description}
                    onChangeText={setDescription}
                    placeholderTextColor={COLORS.mutedForeground}
                />

                {/* Submit Button */}
                <TouchableOpacity
                    style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                            <Text style={styles.submitBtnText}>Submit Request</Text>
                        </>
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
    form: {
        padding: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.foreground,
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        backgroundColor: COLORS.input,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 10,
        padding: 14,
        fontSize: 16,
        color: COLORS.foreground,
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: "top",
    },
    pickerContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    selectOption: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.muted,
    },
    selectOptionActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    selectOptionText: {
        fontSize: 14,
        color: COLORS.foreground,
    },
    selectOptionTextActive: {
        color: "#fff",
        fontWeight: "600",
    },
    typeRow: {
        flexDirection: "row",
        gap: 8,
    },
    typeChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: COLORS.muted,
    },
    typeChipActive: {
        backgroundColor: COLORS.primary,
    },
    typeChipText: {
        fontSize: 14,
        color: COLORS.foreground,
    },
    typeChipTextActive: {
        color: "#fff",
        fontWeight: "600",
    },
    submitBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        borderRadius: 12,
        marginTop: 30,
    },
    submitBtnDisabled: {
        opacity: 0.6,
    },
    submitBtnText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#fff",
    },
});
