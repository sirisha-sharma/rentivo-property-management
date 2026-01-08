import React, { useState, useContext } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PropertyContext } from "../../../context/PropertyContext";
import { TopBar } from "../../../components/TopBar";
import { COLORS } from "../../../constants/theme";

export default function AddProperty() {
    const { addProperty } = useContext(PropertyContext);
    const router = useRouter();

    const [formData, setFormData] = useState({
        title: "",
        address: "",
        type: "",
        units: "",
        splitMethod: "",
    });

    const [roomSizes, setRoomSizes] = useState([{ name: "Room 1", size: "" }]);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const updateField = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
    };

    const addRoom = () => {
        setRoomSizes((prev) => [...prev, { name: `Room ${prev.length + 1}`, size: "" }]);
    };

    const removeRoom = (index) => {
        if (roomSizes.length > 1) {
            setRoomSizes((prev) => prev.filter((_, i) => i !== index));
        }
    };

    const updateRoom = (index, field, value) => {
        setRoomSizes((prev) =>
            prev.map((room, i) => (i === index ? { ...room, [field]: value } : room))
        );
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.title.trim()) newErrors.title = "Property name is required";
        if (!formData.address.trim()) newErrors.address = "Address is required";
        if (!formData.type) newErrors.type = "Type is required";
        if (!formData.units) newErrors.units = "Units required";
        if (!formData.splitMethod) newErrors.splitMethod = "Split method required";

        if (formData.splitMethod === "room-size") {
            roomSizes.forEach((room, index) => {
                if (!room.size) newErrors[`room-${index}`] = "Size required";
            });
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            await addProperty({
                ...formData,
                units: parseInt(formData.units),
                roomSizes: formData.splitMethod === "room-size" ? roomSizes : [],
                images: [], // Placeholder
                amenities: [] // Placeholder
            });
            Alert.alert("Success", "Property added successfully", [
                { text: "OK", onPress: () => router.back() }
            ]);
        } catch (e) {
            Alert.alert("Error", "Failed to add property");
        } finally {
            setLoading(false);
        }
    };

    // Simple selector component since we don't have a complex Select/Popover
    const Selector = ({ label, value, options, onSelect, error }) => (
        <View style={styles.inputGroup}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.chipContainer}>
                {options.map((opt) => (
                    <TouchableOpacity
                        key={opt.value}
                        style={[
                            styles.chip,
                            value === opt.value && styles.chipActive,
                        ]}
                        onPress={() => onSelect(opt.value)}
                    >
                        <Text
                            style={[
                                styles.chipText,
                                value === opt.value && styles.chipTextActive,
                            ]}
                        >
                            {opt.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );

    return (
        <View style={styles.container}>
            <TopBar title="Add Property" showBack />

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Property Name</Text>
                    <TextInput
                        style={[styles.input, errors.title && styles.inputError]}
                        placeholder="e.g. Sunrise Apartments"
                        value={formData.title}
                        onChangeText={(text) => updateField("title", text)}
                        placeholderTextColor={COLORS.mutedForeground}
                    />
                    {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Address</Text>
                    <TextInput
                        style={[styles.input, errors.address && styles.inputError]}
                        placeholder="e.g. Thamel, Kathmandu"
                        value={formData.address}
                        onChangeText={(text) => updateField("address", text)}
                        placeholderTextColor={COLORS.mutedForeground}
                    />
                    {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
                </View>

                <Selector
                    label="Property Type"
                    value={formData.type}
                    options={[
                        { label: "Apartment", value: "Apartment" },
                        { label: "House", value: "House" },
                        { label: "Room", value: "Room" },
                    ]}
                    onSelect={(val) => updateField("type", val)}
                    error={errors.type}
                />

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Number of Units/Rooms</Text>
                    <TextInput
                        style={[styles.input, errors.units && styles.inputError]}
                        placeholder="e.g. 4"
                        value={formData.units}
                        onChangeText={(text) => updateField("units", text)}
                        keyboardType="number-pad"
                        placeholderTextColor={COLORS.mutedForeground}
                    />
                    {errors.units && <Text style={styles.errorText}>{errors.units}</Text>}
                </View>

                <View style={styles.divider} />

                <Text style={styles.sectionTitle}>Utility Configuration</Text>

                <Selector
                    label="Default Splitting Method"
                    value={formData.splitMethod}
                    options={[
                        { label: "Equal", value: "equal" },
                        { label: "Room Size", value: "room-size" },
                        { label: "Occupancy", value: "occupancy" },
                    ]}
                    onSelect={(val) => updateField("splitMethod", val)}
                    error={errors.splitMethod}
                />

                {formData.splitMethod === "room-size" && (
                    <View style={styles.roomSizesContainer}>
                        <Text style={styles.helperText}>Enter room sizes in sq. ft.</Text>
                        {roomSizes.map((room, index) => (
                            <View key={index} style={styles.roomRow}>
                                <TextInput
                                    style={[styles.input, styles.roomNameInput]}
                                    value={room.name}
                                    onChangeText={(text) => updateRoom(index, "name", text)}
                                />
                                <TextInput
                                    style={[styles.input, styles.roomSizeInput, errors[`room-${index}`] && styles.inputError]}
                                    placeholder="Size"
                                    value={room.size}
                                    onChangeText={(text) => updateRoom(index, "size", text)}
                                    keyboardType="number-pad"
                                />
                                <TouchableOpacity
                                    onPress={() => removeRoom(index)}
                                    disabled={roomSizes.length === 1}
                                    style={styles.deleteButton}
                                >
                                    <Ionicons name="trash-outline" size={20} color={COLORS.destructive} />
                                </TouchableOpacity>
                            </View>
                        ))}
                        <TouchableOpacity style={styles.addRoomButton} onPress={addRoom}>
                            <Ionicons name="add" size={16} color={COLORS.foreground} />
                            <Text style={styles.addRoomText}>Add Room</Text>
                        </TouchableOpacity>
                    </View>
                )}

            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => router.back()}
                >
                    <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSave}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.saveText}>Save Property</Text>
                    )}
                </TouchableOpacity>
            </View>
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
    inputError: {
        borderColor: COLORS.destructive,
    },
    errorText: {
        fontSize: 12,
        color: COLORS.destructive,
    },
    chipContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: COLORS.muted,
        borderWidth: 1,
        borderColor: "transparent",
    },
    chipActive: {
        backgroundColor: COLORS.card,
        borderColor: COLORS.primary,
    },
    chipText: {
        fontSize: 14,
        color: COLORS.mutedForeground,
    },
    chipTextActive: {
        color: COLORS.primary,
        fontWeight: "600",
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.foreground,
    },
    roomSizesContainer: {
        backgroundColor: COLORS.muted,
        padding: 16,
        borderRadius: 12,
        gap: 12,
    },
    helperText: {
        fontSize: 12,
        color: COLORS.mutedForeground,
    },
    roomRow: {
        flexDirection: "row",
        gap: 8,
        alignItems: "center",
    },
    roomNameInput: {
        flex: 1,
        backgroundColor: COLORS.card,
        height: 40,
    },
    roomSizeInput: {
        width: 80,
        backgroundColor: COLORS.card,
        height: 40,
    },
    deleteButton: {
        padding: 8,
    },
    addRoomButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        backgroundColor: COLORS.card,
        gap: 8,
    },
    addRoomText: {
        fontSize: 14,
        fontWeight: "500",
    },
    footer: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        flexDirection: "row",
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        height: 48,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cancelText: {
        fontSize: 16,
        color: COLORS.foreground,
        fontWeight: "500",
    },
    saveButton: {
        flex: 1,
        height: 48,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
        backgroundColor: COLORS.primary,
    },
    saveText: {
        fontSize: 16,
        color: "#fff",
        fontWeight: "600",
    },
});
