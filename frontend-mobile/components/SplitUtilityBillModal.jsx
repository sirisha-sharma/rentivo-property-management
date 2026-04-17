import React, { useEffect, useState } from "react";
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    TextInput,
    Alert,
    ActivityIndicator,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { COLORS } from "../constants/theme";

const SPLIT_METHOD_OPTIONS = [
    { label: "Equal", value: "equal" },
    { label: "Room Size", value: "room-size" },
    { label: "Occupancy", value: "occupancy" },
    { label: "Custom", value: "custom" },
];

const getDefaultDueDate = () => {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 7);
    return defaultDate;
};

const roundCurrency = (value) =>
    Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const formatSplitMethodLabel = (method) =>
    SPLIT_METHOD_OPTIONS.find((option) => option.value === method)?.label || "Equal";

export default function SplitUtilityBillModal({
    visible,
    onClose,
    onSubmit,
    properties,
    tenants,
    initialPropertyId,
    lockedPropertyId,
    submitting,
}) {
    const [selectedPropertyId, setSelectedPropertyId] = useState(initialPropertyId || "");
    const [splitMethod, setSplitMethod] = useState("equal");
    const [totalAmount, setTotalAmount] = useState("");
    const [description, setDescription] = useState("");
    const [pickedFile, setPickedFile] = useState(null);
    const [dueDate, setDueDate] = useState(getDefaultDueDate());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [occupancyData, setOccupancyData] = useState({});
    const [customShares, setCustomShares] = useState({});

    const propertyOptions = lockedPropertyId
        ? properties.filter((property) => String(property._id) === String(lockedPropertyId))
        : properties;
    const firstPropertyId = properties[0]?._id ? String(properties[0]._id) : "";

    const selectedProperty =
        properties.find((property) => String(property._id) === String(selectedPropertyId)) || null;

    const activeTenants = tenants.filter(
        (tenant) =>
            String(tenant.propertyId?._id || tenant.propertyId) === String(selectedPropertyId) &&
            tenant.status === "Active"
    );

    const roomSizeConfigMissing =
        splitMethod === "room-size" &&
        activeTenants.length > 0 &&
        (!selectedProperty?.roomSizes ||
            selectedProperty.roomSizes.length < activeTenants.length ||
            activeTenants.some(
                (_tenant, index) =>
                    (parseFloat(selectedProperty.roomSizes?.[index]?.size) || 0) <= 0
            ));

    const customAssignedTotal = roundCurrency(
        activeTenants.reduce(
            (sum, tenant) => sum + (parseFloat(customShares[tenant._id]) || 0),
            0
        )
    );
    const customRemaining = roundCurrency((parseFloat(totalAmount) || 0) - customAssignedTotal);

    useEffect(() => {
        if (!visible) {
            return;
        }

        const nextPropertyId =
            initialPropertyId ||
            lockedPropertyId ||
            firstPropertyId;

        setSelectedPropertyId(nextPropertyId ? String(nextPropertyId) : "");
        setTotalAmount("");
        setDescription("");
        setPickedFile(null);
        setDueDate(getDefaultDueDate());
        setShowDatePicker(false);
        setOccupancyData({});
        setCustomShares({});
    }, [visible, initialPropertyId, lockedPropertyId, firstPropertyId]);

    useEffect(() => {
        const nextSelectedProperty =
            properties.find((property) => String(property._id) === String(selectedPropertyId)) || null;

        if (!nextSelectedProperty) {
            setSplitMethod("equal");
            return;
        }

        setSplitMethod(nextSelectedProperty.splitMethod || "equal");
    }, [selectedPropertyId, properties]);

    useEffect(() => {
        const nextActiveTenants = tenants.filter(
            (tenant) =>
                String(tenant.propertyId?._id || tenant.propertyId) === String(selectedPropertyId) &&
                tenant.status === "Active"
        );

        if (nextActiveTenants.length === 0) {
            setOccupancyData({});
            setCustomShares({});
            return;
        }

        setOccupancyData((current) => {
            const nextValues = {};
            nextActiveTenants.forEach((tenant) => {
                nextValues[tenant._id] = current[tenant._id] || "1";
            });
            return nextValues;
        });

        setCustomShares((current) => {
            const nextValues = {};
            nextActiveTenants.forEach((tenant) => {
                nextValues[tenant._id] = current[tenant._id] || "";
            });
            return nextValues;
        });
    }, [selectedPropertyId, tenants]);

    const handleSelectProperty = (property) => {
        setSelectedPropertyId(property._id);
        setSplitMethod(property.splitMethod || "equal");
    };

    const handlePickFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: [
                    "application/pdf",
                    "image/*",
                    "application/msword",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ],
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setPickedFile(result.assets[0]);
            }
        } catch (_error) {
            Alert.alert("Error", "Failed to pick the utility bill file");
        }
    };

    const handleDateChange = (_event, selectedDate) => {
        setShowDatePicker(Platform.OS === "ios");
        if (selectedDate) {
            setDueDate(selectedDate);
        }
    };

    const handleSubmit = async () => {
        if (!selectedPropertyId) {
            Alert.alert("Missing Property", "Please select the property for this bill.");
            return;
        }

        if (activeTenants.length === 0) {
            Alert.alert("No Active Tenants", "This property does not have active tenants to invoice.");
            return;
        }

        const parsedTotalAmount = parseFloat(totalAmount);
        if (!Number.isFinite(parsedTotalAmount) || parsedTotalAmount <= 0) {
            Alert.alert("Invalid Amount", "Enter a valid total utility amount.");
            return;
        }

        if (!pickedFile) {
            Alert.alert("Missing Bill", "Please upload the bill photo or document.");
            return;
        }

        if (roomSizeConfigMissing) {
            Alert.alert(
                "Room Sizes Needed",
                "This property needs complete room size data before using the room-size split."
            );
            return;
        }

        if (splitMethod === "occupancy") {
            const hasInvalidOccupancy = activeTenants.some((tenant) => {
                const count = parseInt(occupancyData[tenant._id], 10);
                return !Number.isFinite(count) || count <= 0;
            });

            if (hasInvalidOccupancy) {
                Alert.alert(
                    "Invalid Occupancy",
                    "Enter a positive occupant count for every active tenant."
                );
                return;
            }
        }

        if (splitMethod === "custom") {
            const hasInvalidCustomAmount = activeTenants.some((tenant) => {
                const amount = parseFloat(customShares[tenant._id]);
                return !Number.isFinite(amount) || amount < 0;
            });

            if (hasInvalidCustomAmount) {
                Alert.alert(
                    "Invalid Custom Split",
                    "Enter a valid amount for each tenant when using the custom split."
                );
                return;
            }

            if (Math.abs(customRemaining) > 0.01) {
                Alert.alert(
                    "Amounts Must Match",
                    "The custom tenant amounts must add up to the total utility bill."
                );
                return;
            }
        }

        try {
            const formData = new FormData();
            formData.append("propertyId", selectedPropertyId);
            formData.append("splitMethod", splitMethod);
            formData.append("totalAmount", String(roundCurrency(parsedTotalAmount)));
            formData.append("dueDate", dueDate.toISOString());
            if (description.trim()) {
                formData.append("description", description.trim());
            }

            if (splitMethod === "occupancy") {
                formData.append("occupancyData", JSON.stringify(occupancyData));
            }

            if (splitMethod === "custom") {
                const customSplitPayload = activeTenants.reduce((accumulator, tenant) => {
                    accumulator[tenant._id] = {
                        other: roundCurrency(parseFloat(customShares[tenant._id]) || 0),
                    };
                    return accumulator;
                }, {});

                formData.append("customSplits", JSON.stringify(customSplitPayload));
            }

            if (Platform.OS === "web") {
                const response = await fetch(pickedFile.uri);
                const blob = await response.blob();
                formData.append("billDocument", blob, pickedFile.name);
            } else {
                formData.append("billDocument", {
                    uri: pickedFile.uri,
                    name: pickedFile.name,
                    type: pickedFile.mimeType || "application/octet-stream",
                });
            }

            await onSubmit(formData);
        } catch (error) {
            Alert.alert(
                "Split Failed",
                error?.response?.data?.message || "We couldn't create the split invoices right now."
            );
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    <View style={styles.header}>
                        <View style={styles.headerCopy}>
                            <Text style={styles.title}>Split Utility Bill</Text>
                            <Text style={styles.subtitle}>
                                Upload one bill and generate utility invoices for every active tenant.
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={onClose}
                            disabled={submitting}
                        >
                            <Ionicons name="close" size={22} color={COLORS.foreground} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        contentContainerStyle={styles.content}
                        showsVerticalScrollIndicator={false}
                    >
                        <Text style={styles.label}>Property *</Text>
                        <View style={styles.optionWrap}>
                            {propertyOptions.map((property) => (
                                <TouchableOpacity
                                    key={property._id}
                                    style={[
                                        styles.optionChip,
                                        String(selectedPropertyId) === String(property._id) &&
                                            styles.optionChipActive,
                                    ]}
                                    onPress={() => handleSelectProperty(property)}
                                    disabled={Boolean(lockedPropertyId)}
                                >
                                    <Text
                                        style={[
                                            styles.optionChipText,
                                            String(selectedPropertyId) === String(property._id) &&
                                                styles.optionChipTextActive,
                                        ]}
                                    >
                                        {property.title}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {selectedProperty ? (
                            <View style={styles.infoCard}>
                                <Ionicons name="business-outline" size={18} color={COLORS.primary} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.infoTitle}>
                                        {activeTenants.length} active tenant
                                        {activeTenants.length === 1 ? "" : "s"}
                                    </Text>
                                    <Text style={styles.infoText}>
                                        Property default: {formatSplitMethodLabel(selectedProperty.splitMethod)}
                                    </Text>
                                </View>
                            </View>
                        ) : null}

                        <Text style={styles.label}>Split Method *</Text>
                        <View style={styles.optionWrap}>
                            {SPLIT_METHOD_OPTIONS.map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={[
                                        styles.optionChip,
                                        splitMethod === option.value && styles.optionChipActive,
                                    ]}
                                    onPress={() => setSplitMethod(option.value)}
                                >
                                    <Text
                                        style={[
                                            styles.optionChipText,
                                            splitMethod === option.value && styles.optionChipTextActive,
                                        ]}
                                    >
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Total Utility Amount (NPR) *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 4800"
                            keyboardType="numeric"
                            value={totalAmount}
                            onChangeText={setTotalAmount}
                            placeholderTextColor={COLORS.mutedForeground}
                        />

                        {splitMethod === "room-size" && selectedProperty ? (
                            <View style={styles.methodCard}>
                                <Text style={styles.methodTitle}>Room Size Allocation</Text>
                                <Text style={styles.methodText}>
                                    The bill will be divided using the room sizes saved on this property.
                                </Text>
                                {selectedProperty.roomSizes?.slice(0, activeTenants.length).map((room, index) => (
                                    <Text key={`${room.name}-${index}`} style={styles.methodMeta}>
                                        {room.name || `Room ${index + 1}`}: {room.size || 0} sq ft
                                    </Text>
                                ))}
                                {roomSizeConfigMissing ? (
                                    <Text style={styles.warningText}>
                                        Complete room sizes are required before this method can be used.
                                    </Text>
                                ) : null}
                            </View>
                        ) : null}

                        {splitMethod === "occupancy" ? (
                            <View style={styles.methodCard}>
                                <Text style={styles.methodTitle}>Occupancy Counts</Text>
                                <Text style={styles.methodText}>
                                    Enter how many occupants belong to each active tenant.
                                </Text>
                                {activeTenants.map((tenant) => (
                                    <View key={tenant._id} style={styles.rowField}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.rowLabel}>
                                                {tenant.userId?.name || tenant.userId?.email || "Tenant"}
                                            </Text>
                                        </View>
                                        <TextInput
                                            style={styles.rowInput}
                                            keyboardType="numeric"
                                            value={occupancyData[tenant._id] || ""}
                                            onChangeText={(value) =>
                                                setOccupancyData((current) => ({
                                                    ...current,
                                                    [tenant._id]: value,
                                                }))
                                            }
                                            placeholder="1"
                                            placeholderTextColor={COLORS.mutedForeground}
                                        />
                                    </View>
                                ))}
                            </View>
                        ) : null}

                        {splitMethod === "custom" ? (
                            <View style={styles.methodCard}>
                                <Text style={styles.methodTitle}>Custom Shares</Text>
                                <Text style={styles.methodText}>
                                    Enter the exact utility amount each tenant should pay.
                                </Text>
                                {activeTenants.map((tenant) => (
                                    <View key={tenant._id} style={styles.rowField}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.rowLabel}>
                                                {tenant.userId?.name || tenant.userId?.email || "Tenant"}
                                            </Text>
                                        </View>
                                        <TextInput
                                            style={styles.rowInput}
                                            keyboardType="numeric"
                                            value={customShares[tenant._id] || ""}
                                            onChangeText={(value) =>
                                                setCustomShares((current) => ({
                                                    ...current,
                                                    [tenant._id]: value,
                                                }))
                                            }
                                            placeholder="0"
                                            placeholderTextColor={COLORS.mutedForeground}
                                        />
                                    </View>
                                ))}
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryText}>
                                        Assigned: NPR {customAssignedTotal.toLocaleString()}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.summaryText,
                                            Math.abs(customRemaining) > 0.01 && styles.summaryTextWarning,
                                        ]}
                                    >
                                        Remaining: NPR {customRemaining.toLocaleString()}
                                    </Text>
                                </View>
                            </View>
                        ) : null}

                        <Text style={styles.label}>Due Date *</Text>
                        <TouchableOpacity
                            style={styles.dateButton}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Ionicons name="calendar-outline" size={18} color={COLORS.mutedForeground} />
                            <Text style={styles.dateButtonText}>{dueDate.toLocaleDateString()}</Text>
                        </TouchableOpacity>
                        {showDatePicker ? (
                            <DateTimePicker
                                value={dueDate}
                                mode="date"
                                display="default"
                                minimumDate={new Date()}
                                onChange={handleDateChange}
                            />
                        ) : null}

                        <Text style={styles.label}>Bill File *</Text>
                        <TouchableOpacity style={styles.filePicker} onPress={handlePickFile}>
                            <Ionicons
                                name={pickedFile ? "document-attach-outline" : "cloud-upload-outline"}
                                size={18}
                                color={pickedFile ? COLORS.primary : COLORS.mutedForeground}
                            />
                            <Text
                                style={[
                                    styles.filePickerText,
                                    pickedFile && styles.filePickerTextActive,
                                ]}
                            >
                                {pickedFile ? pickedFile.name : "Select a photo or document"}
                            </Text>
                        </TouchableOpacity>

                        <Text style={styles.label}>Note (Optional)</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Add context for the tenants..."
                            multiline
                            numberOfLines={3}
                            value={description}
                            onChangeText={setDescription}
                            placeholderTextColor={COLORS.mutedForeground}
                        />
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={onClose}
                            disabled={submitting}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                            onPress={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="git-branch-outline" size={18} color="#fff" />
                                    <Text style={styles.submitButtonText}>Create Split Invoices</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(15, 23, 42, 0.56)",
        justifyContent: "flex-end",
    },
    sheet: {
        maxHeight: "92%",
        backgroundColor: COLORS.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingTop: 18,
    },
    header: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerCopy: {
        flex: 1,
        paddingRight: 12,
    },
    title: {
        fontSize: 20,
        fontWeight: "700",
        color: COLORS.foreground,
    },
    subtitle: {
        marginTop: 6,
        fontSize: 13,
        lineHeight: 19,
        color: COLORS.mutedForeground,
    },
    closeButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.muted,
    },
    content: {
        padding: 20,
        paddingBottom: 24,
    },
    label: {
        marginTop: 16,
        marginBottom: 8,
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.foreground,
    },
    optionWrap: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    optionChip: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.muted,
    },
    optionChipActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    optionChipText: {
        fontSize: 13,
        color: COLORS.foreground,
        fontWeight: "500",
    },
    optionChipTextActive: {
        color: "#fff",
    },
    infoCard: {
        marginTop: 12,
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.surface,
        flexDirection: "row",
        gap: 10,
        alignItems: "flex-start",
    },
    infoTitle: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.foreground,
    },
    infoText: {
        marginTop: 2,
        fontSize: 12,
        color: COLORS.mutedForeground,
    },
    input: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: COLORS.foreground,
        backgroundColor: COLORS.input,
    },
    textArea: {
        minHeight: 84,
        textAlignVertical: "top",
    },
    methodCard: {
        marginTop: 12,
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.surface,
    },
    methodTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: COLORS.foreground,
    },
    methodText: {
        marginTop: 4,
        fontSize: 12,
        lineHeight: 18,
        color: COLORS.mutedForeground,
    },
    methodMeta: {
        marginTop: 8,
        fontSize: 12,
        color: COLORS.foreground,
    },
    warningText: {
        marginTop: 10,
        fontSize: 12,
        color: COLORS.destructive,
        fontWeight: "600",
    },
    rowField: {
        marginTop: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    rowLabel: {
        fontSize: 13,
        color: COLORS.foreground,
        fontWeight: "500",
    },
    rowInput: {
        width: 96,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        textAlign: "right",
        color: COLORS.foreground,
        backgroundColor: COLORS.input,
    },
    summaryRow: {
        marginTop: 14,
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 12,
    },
    summaryText: {
        fontSize: 12,
        color: COLORS.mutedForeground,
        fontWeight: "600",
    },
    summaryTextWarning: {
        color: COLORS.destructive,
    },
    dateButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.input,
    },
    dateButtonText: {
        fontSize: 14,
        color: COLORS.foreground,
    },
    filePicker: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.input,
    },
    filePickerText: {
        fontSize: 14,
        color: COLORS.mutedForeground,
    },
    filePickerTextActive: {
        color: COLORS.foreground,
        fontWeight: "500",
    },
    footer: {
        flexDirection: "row",
        gap: 12,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 20,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    cancelButton: {
        minWidth: 96,
        paddingHorizontal: 18,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.muted,
    },
    cancelButtonText: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.foreground,
    },
    submitButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        borderRadius: 12,
        paddingHorizontal: 18,
        paddingVertical: 14,
        backgroundColor: COLORS.primary,
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#fff",
    },
});
