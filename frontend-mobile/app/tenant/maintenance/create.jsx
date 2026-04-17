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
    Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { TopBar } from "../../../components/TopBar";
import { MaintenanceContext } from "../../../context/MaintenanceContext";
import { PropertyContext } from "../../../context/PropertyContext";
import { COLORS } from "../../../constants/theme";
import { resolveMediaUrl } from "../../../utils/media";

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
    const [photos, setPhotos] = useState([]);

    const formatUrgencyLabel = (value) => `${value} Urgency`;

    // Fetch properties when screen loads
    useEffect(() => {
        fetchProperties();
    }, [fetchProperties]);

    const pickPhotos = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("Permission Denied", "Photo library access is required to attach photos.");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 0.8,
            selectionLimit: 5,
        });

        if (!result.canceled && result.assets?.length) {
            setPhotos((prev) => [...prev, ...result.assets].slice(0, 5));
        }
    };

    const removePhoto = (indexToRemove) => {
        setPhotos((prev) => prev.filter((_, index) => index !== indexToRemove));
    };

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
                photos,
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
                <View style={styles.introCard}>
                    <View style={styles.introIcon}>
                        <Ionicons name="construct-outline" size={20} color={COLORS.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.introTitle}>Describe the issue clearly</Text>
                        <Text style={styles.introText}>
                            Add the affected property, urgency, and a helpful description so the landlord can act faster.
                        </Text>
                    </View>
                </View>

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

                <Text style={styles.label}>Photos (Optional)</Text>
                <View style={styles.photoCard}>
                    <View style={styles.photoCardHeader}>
                        <View style={styles.photoCardCopy}>
                            <Text style={styles.photoCardTitle}>Add issue photos</Text>
                            <Text style={styles.photoCardText}>
                                Attach up to 5 photos to help the landlord understand the problem faster.
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.photoButton}
                            onPress={pickPhotos}
                            disabled={photos.length >= 5}
                        >
                            <Ionicons name="images-outline" size={18} color="#fff" />
                            <Text style={styles.photoButtonText}>
                                {photos.length ? "Add More" : "Pick Photos"}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {photos.length > 0 ? (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.photoPreviewRow}
                        >
                            {photos.map((photo, index) => (
                                <View key={`${photo.assetId || photo.uri}-${index}`} style={styles.photoPreviewCard}>
                                    <Image
                                        source={{ uri: resolveMediaUrl(photo.uri || photo) }}
                                        style={styles.photoPreviewImage}
                                    />
                                    <TouchableOpacity
                                        style={styles.photoRemoveButton}
                                        onPress={() => removePhoto(index)}
                                    >
                                        <Ionicons name="close" size={14} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>
                    ) : (
                        <View style={styles.photoPlaceholder}>
                            <Ionicons name="camera-outline" size={18} color={COLORS.mutedForeground} />
                            <Text style={styles.photoPlaceholderText}>No photos selected yet</Text>
                        </View>
                    )}
                </View>

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
    introCard: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 14,
        backgroundColor: COLORS.surface,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 16,
        marginBottom: 4,
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
    photoCard: {
        marginTop: 4,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.card,
        padding: 14,
        gap: 12,
    },
    photoCardHeader: {
        gap: 12,
    },
    photoCardCopy: {
        gap: 4,
    },
    photoCardTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: COLORS.foreground,
    },
    photoCardText: {
        fontSize: 13,
        lineHeight: 20,
        color: COLORS.mutedForeground,
    },
    photoButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        alignSelf: "flex-start",
        backgroundColor: COLORS.primary,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
    },
    photoButtonText: {
        color: "#fff",
        fontSize: 13,
        fontWeight: "600",
    },
    photoPreviewRow: {
        gap: 10,
    },
    photoPreviewCard: {
        position: "relative",
    },
    photoPreviewImage: {
        width: 104,
        height: 82,
        borderRadius: 12,
        backgroundColor: COLORS.muted,
    },
    photoRemoveButton: {
        position: "absolute",
        top: 6,
        right: 6,
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(15,23,42,0.72)",
    },
    photoPlaceholder: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 6,
    },
    photoPlaceholderText: {
        fontSize: 13,
        color: COLORS.mutedForeground,
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
