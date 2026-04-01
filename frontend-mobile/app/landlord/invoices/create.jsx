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

    // Breakdown state
    const [showBreakdown, setShowBreakdown] = useState(false);
    const [baseRent, setBaseRent] = useState("");
    const [electricity, setElectricity] = useState("");
    const [water, setWater] = useState("");
    const [internet, setInternet] = useState("");
    const [gas, setGas] = useState("");
    const [waste, setWaste] = useState("");
    const [otherUtility, setOtherUtility] = useState("");

    useEffect(() => {
        fetchProperties();
        fetchTenants();
    }, []);

    // Auto-calculate total amount from breakdown fields
    useEffect(() => {
        if (showBreakdown) {
            const base = parseFloat(baseRent) || 0;
            const totalUtils =
                (parseFloat(electricity) || 0) +
                (parseFloat(water) || 0) +
                (parseFloat(internet) || 0) +
                (parseFloat(gas) || 0) +
                (parseFloat(waste) || 0) +
                (parseFloat(otherUtility) || 0);
            const total = base + totalUtils;
            setAmount(total > 0 ? String(total) : "");
        }
    }, [showBreakdown, baseRent, electricity, water, internet, gas, waste, otherUtility]);

    // Reset breakdown fields when toggled off
    const toggleBreakdown = () => {
        if (showBreakdown) {
            setBaseRent("");
            setElectricity("");
            setWater("");
            setInternet("");
            setGas("");
            setWaste("");
            setOtherUtility("");
            setAmount("");
        }
        setShowBreakdown(!showBreakdown);
    };

    // Filter tenants for selected property
    const filteredTenants = tenants.filter(
        (t) => t.propertyId?._id === selectedPropertyId && t.status === "Active"
    );

    const handleSubmit = async () => {
        if (!selectedPropertyId || !selectedTenantId || !amount) {
            Alert.alert("Error", "Please fill in all required fields");
            return;
        }

        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            Alert.alert("Error", "Please enter a valid amount");
            return;
        }

        const invoiceData = {
            propertyId: selectedPropertyId,
            tenantId: selectedTenantId,
            amount: parsedAmount,
            type,
            dueDate: dueDate.toISOString(),
            description,
        };

        if (showBreakdown) {
            const totalUtilities =
                (parseFloat(electricity) || 0) +
                (parseFloat(water) || 0) +
                (parseFloat(internet) || 0) +
                (parseFloat(gas) || 0) +
                (parseFloat(waste) || 0) +
                (parseFloat(otherUtility) || 0);

            invoiceData.breakdown = {
                baseRent: parseFloat(baseRent) || 0,
                utilities: {
                    electricity: parseFloat(electricity) || 0,
                    water: parseFloat(water) || 0,
                    internet: parseFloat(internet) || 0,
                    gas: parseFloat(gas) || 0,
                    waste: parseFloat(waste) || 0,
                    other: parseFloat(otherUtility) || 0,
                },
                totalUtilities,
            };
        }

        try {
            await createInvoice(invoiceData);
            Alert.alert("Success", "Invoice created successfully", [
                { text: "OK", onPress: () => router.back() },
            ]);
        } catch (err) {
            const message = err?.response?.data?.message || "Failed to create invoice";
            Alert.alert("Error", message);
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

                {/* Breakdown Toggle */}
                <TouchableOpacity style={styles.breakdownToggle} onPress={toggleBreakdown}>
                    <Ionicons
                        name={showBreakdown ? "remove-circle-outline" : "add-circle-outline"}
                        size={20}
                        color={COLORS.primary}
                    />
                    <Text style={styles.breakdownToggleText}>
                        {showBreakdown ? "Remove Breakdown" : "Add Cost Breakdown"}
                    </Text>
                </TouchableOpacity>

                {/* Breakdown Fields */}
                {showBreakdown && (
                    <View style={styles.breakdownSection}>
                        <Text style={styles.breakdownTitle}>Cost Breakdown</Text>

                        <Text style={styles.label}>Base Rent (NPR)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="0"
                            keyboardType="numeric"
                            value={baseRent}
                            onChangeText={setBaseRent}
                            placeholderTextColor={COLORS.mutedForeground}
                        />

                        <Text style={styles.breakdownSubtitle}>Utilities</Text>

                        <View style={styles.utilityRow}>
                            <View style={styles.utilityField}>
                                <Text style={styles.utilityLabel}>Electricity</Text>
                                <TextInput
                                    style={styles.utilityInput}
                                    placeholder="0"
                                    keyboardType="numeric"
                                    value={electricity}
                                    onChangeText={setElectricity}
                                    placeholderTextColor={COLORS.mutedForeground}
                                />
                            </View>
                            <View style={styles.utilityField}>
                                <Text style={styles.utilityLabel}>Water</Text>
                                <TextInput
                                    style={styles.utilityInput}
                                    placeholder="0"
                                    keyboardType="numeric"
                                    value={water}
                                    onChangeText={setWater}
                                    placeholderTextColor={COLORS.mutedForeground}
                                />
                            </View>
                        </View>

                        <View style={styles.utilityRow}>
                            <View style={styles.utilityField}>
                                <Text style={styles.utilityLabel}>Internet</Text>
                                <TextInput
                                    style={styles.utilityInput}
                                    placeholder="0"
                                    keyboardType="numeric"
                                    value={internet}
                                    onChangeText={setInternet}
                                    placeholderTextColor={COLORS.mutedForeground}
                                />
                            </View>
                            <View style={styles.utilityField}>
                                <Text style={styles.utilityLabel}>Gas</Text>
                                <TextInput
                                    style={styles.utilityInput}
                                    placeholder="0"
                                    keyboardType="numeric"
                                    value={gas}
                                    onChangeText={setGas}
                                    placeholderTextColor={COLORS.mutedForeground}
                                />
                            </View>
                        </View>

                        <View style={styles.utilityRow}>
                            <View style={styles.utilityField}>
                                <Text style={styles.utilityLabel}>Waste</Text>
                                <TextInput
                                    style={styles.utilityInput}
                                    placeholder="0"
                                    keyboardType="numeric"
                                    value={waste}
                                    onChangeText={setWaste}
                                    placeholderTextColor={COLORS.mutedForeground}
                                />
                            </View>
                            <View style={styles.utilityField}>
                                <Text style={styles.utilityLabel}>Other</Text>
                                <TextInput
                                    style={styles.utilityInput}
                                    placeholder="0"
                                    keyboardType="numeric"
                                    value={otherUtility}
                                    onChangeText={setOtherUtility}
                                    placeholderTextColor={COLORS.mutedForeground}
                                />
                            </View>
                        </View>

                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Total Amount</Text>
                            <Text style={styles.totalValue}>NPR {amount || "0"}</Text>
                        </View>
                    </View>
                )}

                {/* Amount (manual entry when no breakdown) */}
                {!showBreakdown && (
                    <>
                        <Text style={styles.label}>Amount (NPR) *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 15000"
                            keyboardType="numeric"
                            value={amount}
                            onChangeText={setAmount}
                            placeholderTextColor={COLORS.mutedForeground}
                        />
                    </>
                )}

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
        flexWrap: "wrap",
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
    breakdownToggle: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 20,
        paddingVertical: 10,
    },
    breakdownToggleText: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.primary,
    },
    breakdownSection: {
        backgroundColor: COLORS.muted,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    breakdownTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: COLORS.foreground,
        marginBottom: 4,
    },
    breakdownSubtitle: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.mutedForeground,
        marginTop: 16,
        marginBottom: 8,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    utilityRow: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 12,
    },
    utilityField: {
        flex: 1,
    },
    utilityLabel: {
        fontSize: 12,
        fontWeight: "600",
        color: COLORS.foreground,
        marginBottom: 4,
    },
    utilityInput: {
        backgroundColor: COLORS.input,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        padding: 10,
        fontSize: 14,
        color: COLORS.foreground,
    },
    totalRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    totalLabel: {
        fontSize: 15,
        fontWeight: "700",
        color: COLORS.foreground,
    },
    totalValue: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.primary,
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
        marginBottom: 20,
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
