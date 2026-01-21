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
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { TopBar } from "../../../components/TopBar";
import { InvoiceContext } from "../../../context/InvoiceContext";
import { PropertyContext } from "../../../context/PropertyContext";
import { TenantContext } from "../../../context/TenantContext";
import { COLORS } from "../../../constants/theme";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function CreateInvoice() {
    const router = useRouter();
    const { createInvoice, loading } = useContext(InvoiceContext);
    const { properties, fetchProperties } = useContext(PropertyContext);
    const { tenants, fetchTenants } = useContext(TenantContext);

    const [selectedPropertyId, setSelectedPropertyId] = useState("");
    const [selectedTenantId, setSelectedTenantId] = useState("");
    const [amount, setAmount] = useState("");
    const [type, setType] = useState("Rent");
    const [dueDate, setDueDate] = useState(new Date());
    const [description, setDescription] = useState("");
    const [showDatePicker, setShowDatePicker] = useState(false);

    useEffect(() => {
        fetchProperties();
        fetchTenants();
    }, []);

    // Filter tenants for selected property
    const filteredTenants = tenants.filter(
        (t) => t.propertyId?._id === selectedPropertyId && t.status === "Active"
    );

    const handleSubmit = async () => {
        if (!selectedPropertyId || !selectedTenantId || !amount) {
            Alert.alert("Error", "Please fill in all required fields");
            return;
        }

        try {
            await createInvoice({
                propertyId: selectedPropertyId,
                tenantId: selectedTenantId,
                amount: parseFloat(amount),
                type,
                dueDate: dueDate.toISOString(),
                description,
            });
            Alert.alert("Success", "Invoice created successfully", [
                { text: "OK", onPress: () => router.back() },
            ]);
        } catch (err) {
            Alert.alert("Error", "Failed to create invoice");
        }
    };

    const onDateChange = (event, selectedDate) => {
        setShowDatePicker(Platform.OS === "ios");
        if (selectedDate) {
            setDueDate(selectedDate);
        }
    };

    const invoiceTypes = ["Rent", "Maintenance", "Utilities", "Other"];

    return (
        <View style={styles.container}>
            <TopBar title="Create Invoice" showBack />

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
                            onPress={() => {
                                setSelectedPropertyId(prop._id);
                                setSelectedTenantId(""); // Reset tenant when property changes
                            }}
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

                {/* Tenant Selection */}
                <Text style={styles.label}>Tenant *</Text>
                {!selectedPropertyId ? (
                    <Text style={styles.hint}>Select a property first</Text>
                ) : filteredTenants.length === 0 ? (
                    <Text style={styles.hint}>No active tenants for this property</Text>
                ) : (
                    <View style={styles.pickerContainer}>
                        {filteredTenants.map((tenant) => (
                            <TouchableOpacity
                                key={tenant._id}
                                style={[
                                    styles.selectOption,
                                    selectedTenantId === tenant._id && styles.selectOptionActive,
                                ]}
                                onPress={() => setSelectedTenantId(tenant._id)}
                            >
                                <Text
                                    style={[
                                        styles.selectOptionText,
                                        selectedTenantId === tenant._id && styles.selectOptionTextActive,
                                    ]}
                                >
                                    {tenant.userId?.name || tenant.userId?.email}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Invoice Type */}
                <Text style={styles.label}>Type *</Text>
                <View style={styles.typeRow}>
                    {invoiceTypes.map((t) => (
                        <TouchableOpacity
                            key={t}
                            style={[styles.typeChip, type === t && styles.typeChipActive]}
                            onPress={() => setType(t)}
                        >
                            <Text style={[styles.typeChipText, type === t && styles.typeChipTextActive]}>
                                {t}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Amount */}
                <Text style={styles.label}>Amount (NPR) *</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g. 15000"
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={setAmount}
                    placeholderTextColor={COLORS.mutedForeground}
                />

                {/* Due Date */}
                <Text style={styles.label}>Due Date *</Text>
                <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
                    <Ionicons name="calendar-outline" size={20} color={COLORS.mutedForeground} />
                    <Text style={styles.dateText}>{dueDate.toLocaleDateString()}</Text>
                </TouchableOpacity>
                {showDatePicker && (
                    <DateTimePicker
                        value={dueDate}
                        mode="date"
                        display="default"
                        onChange={onDateChange}
                        minimumDate={new Date()}
                    />
                )}

                {/* Description */}
                <Text style={styles.label}>Description (Optional)</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Add any notes..."
                    multiline
                    numberOfLines={3}
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
                            <Text style={styles.submitBtnText}>Create Invoice</Text>
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
    hint: {
        fontSize: 13,
        color: COLORS.mutedForeground,
        fontStyle: "italic",
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
        minHeight: 80,
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
    dateBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: COLORS.input,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 10,
        padding: 14,
    },
    dateText: {
        fontSize: 16,
        color: COLORS.foreground,
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
