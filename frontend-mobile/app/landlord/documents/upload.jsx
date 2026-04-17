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
import * as DocumentPicker from "expo-document-picker";
import { TopBar } from "../../../components/TopBar";
import { DocumentContext } from "../../../context/DocumentContext";
import { PropertyContext } from "../../../context/PropertyContext";
import { COLORS } from "../../../constants/theme";

export default function UploadDocument() {
    const router = useRouter();
    const { uploadDocument, loading } = useContext(DocumentContext);
    const { properties, fetchProperties } = useContext(PropertyContext);

    const [selectedProperty, setSelectedProperty] = useState(null);
    const [name, setName] = useState("");
    const [type, setType] = useState("Lease Agreement");
    const [pickedFile, setPickedFile] = useState(null);

    useEffect(() => {
        fetchProperties();
    }, [fetchProperties]);

    const handlePickFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ["application/pdf", "image/*", "application/msword",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setPickedFile(result.assets[0]);
            }
        } catch (_error) {
            Alert.alert("Error", "Failed to pick file");
        }
    };

    const handleSubmit = async () => {
        if (!selectedProperty || !name.trim() || !pickedFile) {
            Alert.alert("Error", "Please fill all fields and pick a file");
            return;
        }

        try {
            const formData = new FormData();
            formData.append("propertyId", selectedProperty._id);
            formData.append("name", name.trim());
            formData.append("type", type);

            // Handle file for both web and native
            if (Platform.OS === "web") {
                const response = await fetch(pickedFile.uri);
                const blob = await response.blob();
                formData.append("file", blob, pickedFile.name);
            } else {
                formData.append("file", {
                    uri: pickedFile.uri,
                    name: pickedFile.name,
                    type: pickedFile.mimeType || "application/octet-stream",
                });
            }

            await uploadDocument(formData);
            Alert.alert("Success", "Document uploaded successfully", [
                { text: "OK", onPress: () => router.back() },
            ]);
        } catch (_error) {
            Alert.alert("Error", "Failed to upload document");
        }
    };

    const types = ["Lease Agreement", "ID Proof", "Other"];

    return (
        <View style={styles.container}>
            <TopBar title="Upload Document" showBack />

            <ScrollView contentContainerStyle={styles.form}>
                <View style={styles.introCard}>
                    <View style={styles.introIcon}>
                        <Ionicons name="cloud-upload-outline" size={20} color={COLORS.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.introTitle}>Organize key paperwork</Text>
                        <Text style={styles.introText}>
                            Upload agreements, proofs, and property documents so teams can access them securely later.
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
                                selectedProperty?._id === prop._id && styles.selectOptionActive,
                            ]}
                            onPress={() => setSelectedProperty(prop)}
                        >
                            <Text
                                style={[
                                    styles.selectOptionText,
                                    selectedProperty?._id === prop._id && styles.selectOptionTextActive,
                                ]}
                            >
                                {prop.title}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Document Name */}
                <Text style={styles.label}>Document Name *</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g. Lease Agreement - Unit 3A"
                    value={name}
                    onChangeText={setName}
                    placeholderTextColor={COLORS.mutedForeground}
                />

                {/* Document Type */}
                <Text style={styles.label}>Document Type *</Text>
                <View style={styles.typeRow}>
                    {types.map((t) => (
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

                {/* File Picker */}
                <Text style={styles.label}>File *</Text>
                <TouchableOpacity style={styles.filePickerBtn} onPress={handlePickFile}>
                    <Ionicons
                        name={pickedFile ? "document-attach" : "cloud-upload-outline"}
                        size={20}
                        color={pickedFile ? COLORS.primary : COLORS.mutedForeground}
                    />
                    <Text style={[styles.filePickerText, pickedFile && { color: COLORS.foreground }]}>
                        {pickedFile ? pickedFile.name : "Tap to select a file"}
                    </Text>
                </TouchableOpacity>

                {/* Submit */}
                <TouchableOpacity
                    style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
                            <Text style={styles.submitBtnText}>Upload Document</Text>
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
    filePickerBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: COLORS.input,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 10,
        borderStyle: "dashed",
        padding: 16,
    },
    filePickerText: {
        fontSize: 14,
        color: COLORS.mutedForeground,
        flex: 1,
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
