import React, { useState, useContext, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Alert,
    Image,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PropertyContext } from "../../../context/PropertyContext";
import { TopBar } from "../../../components/TopBar";
import { COLORS } from "../../../constants/theme";

export default function EditProperty() {
    const { getPropertyById, updateProperty } = useContext(PropertyContext);
    const router = useRouter();
    const { id } = useLocalSearchParams();

    const [formData, setFormData] = useState({
        title: "",
        address: "",
        type: "",
        units: "",
        splitMethod: "",
        status: "",
    });

    const [roomSizes, setRoomSizes] = useState([]);
    const [images, setImages] = useState([]);
    const [amenities, setAmenities] = useState([]);
    const [newImageUrl, setNewImageUrl] = useState("");
    const [newAmenity, setNewAmenity] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        const loadProperty = async () => {
            try {
                const property = await getPropertyById(id);
                setFormData({
                    title: property.title || "",
                    address: property.address || "",
                    type: property.type || "",
                    units: property.units?.toString() || "",
                    splitMethod: property.splitMethod || "",
                    status: property.status || "vacant",
                });
                setRoomSizes(property.roomSizes || []);
                setImages(property.images || []);
                setAmenities(property.amenities || []);
            } catch (e) {
                Alert.alert("Error", "Failed to load property");
                router.back();
            } finally {
                setLoading(false);
            }
        };
        loadProperty();
    }, [id]);

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

    const addImage = () => {
        if (newImageUrl.trim()) {
            setImages((prev) => [...prev, newImageUrl.trim()]);
            setNewImageUrl("");
        }
    };

    const removeImage = (index) => {
        setImages((prev) => prev.filter((_, i) => i !== index));
    };

    const addAmenityItem = () => {
        if (newAmenity.trim()) {
            setAmenities((prev) => [...prev, newAmenity.trim()]);
            setNewAmenity("");
        }
    };

    const removeAmenity = (index) => {
        setAmenities((prev) => prev.filter((_, i) => i !== index));
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.title.trim()) newErrors.title = "Property name is required";
        if (!formData.address.trim()) newErrors.address = "Address is required";
        if (!formData.type) newErrors.type = "Type is required";
        if (!formData.units) newErrors.units = "Units required";
        if (!formData.splitMethod) newErrors.splitMethod = "Split method required";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) return;

        setSaving(true);
        try {
            await updateProperty(id, {
                ...formData,
                units: parseInt(formData.units),
                roomSizes: formData.splitMethod === "room-size" ? roomSizes : [],
                images,
                amenities,
            });
            Alert.alert("Success", "Property updated successfully", [
                { text: "OK", onPress: () => router.back() }
            ]);
        } catch (e) {
            Alert.alert("Error", "Failed to update property");
        } finally {
            setSaving(false);
        }
    };

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

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <TopBar title="Edit Property" showBack />

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

                <Selector
                    label="Status"
                    value={formData.status}
                    options={[
                        { label: "Vacant", value: "vacant" },
                        { label: "Occupied", value: "occupied" },
                        { label: "Maintenance", value: "maintenance" },
                    ]}
                    onSelect={(val) => updateField("status", val)}
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

                <Text style={styles.sectionTitle}>Property Images</Text>
                <View style={styles.imageSection}>
                    {images.length > 0 && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagePreviewRow}>
                            {images.map((img, index) => (
                                <View key={index} style={styles.imagePreviewContainer}>
                                    <Image source={{ uri: img }} style={styles.imagePreview} />
                                    <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeImage(index)}>
                                        <Ionicons name="close-circle" size={24} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>
                    )}
                    <View style={styles.addImageRow}>
                        <TextInput
                            style={[styles.input, { flex: 1 }]}
                            placeholder="Paste image URL"
                            value={newImageUrl}
                            onChangeText={setNewImageUrl}
                            placeholderTextColor={COLORS.mutedForeground}
                        />
                        <TouchableOpacity style={styles.addImageBtn} onPress={addImage}>
                            <Ionicons name="add" size={20} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.divider} />

                <Text style={styles.sectionTitle}>Amenities</Text>
                <View style={styles.amenitiesSection}>
                    <View style={styles.amenitiesList}>
                        {amenities.map((amenity, index) => (
                            <View key={index} style={styles.amenityItem}>
                                <Text style={styles.amenityText}>{amenity}</Text>
                                <TouchableOpacity onPress={() => removeAmenity(index)}>
                                    <Ionicons name="close" size={16} color={COLORS.mutedForeground} />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                    <View style={styles.addImageRow}>
                        <TextInput
                            style={[styles.input, { flex: 1 }]}
                            placeholder="e.g. WiFi, Pool, Gym"
                            value={newAmenity}
                            onChangeText={setNewAmenity}
                            placeholderTextColor={COLORS.mutedForeground}
                        />
                        <TouchableOpacity style={styles.addImageBtn} onPress={addAmenityItem}>
                            <Ionicons name="add" size={20} color="white" />
                        </TouchableOpacity>
                    </View>
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
                                    style={[styles.input, styles.roomSizeInput]}
                                    placeholder="Size"
                                    value={room.size?.toString()}
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
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.saveText}>Save Changes</Text>
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
    center: {
        justifyContent: "center",
        alignItems: "center",
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
    imageSection: {
        gap: 12,
    },
    imagePreviewRow: {
        flexDirection: "row",
    },
    imagePreviewContainer: {
        position: "relative",
        marginRight: 12,
    },
    imagePreview: {
        width: 100,
        height: 80,
        borderRadius: 8,
    },
    removeImageBtn: {
        position: "absolute",
        top: -8,
        right: -8,
        backgroundColor: "white",
        borderRadius: 12,
    },
    addImageRow: {
        flexDirection: "row",
        gap: 8,
    },
    addImageBtn: {
        width: 48,
        height: 48,
        backgroundColor: COLORS.primary,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    amenitiesSection: {
        gap: 12,
    },
    amenitiesList: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    amenityItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.muted,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
        gap: 8,
    },
    amenityText: {
        fontSize: 14,
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
