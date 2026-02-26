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
import { DocumentContext } from "../../../context/DocumentContext";
import { PropertyContext } from "../../../context/PropertyContext";
import { COLORS } from "../../../constants/theme";

export default function UploadDocument() {
    const router = useRouter();
    const { addDocument } = useContext(DocumentContext);
    const { properties, fetchProperties } = useContext(PropertyContext);

    const [selectedProperty, setSelectedProperty] = useState(null);
    const [name, setName] = useState("");
    const [type, setType] = useState("Lease Agreement");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchProperties();
    }, []);

    const handleSubmit = () => {
        if (!selectedProperty || !name.trim()) {
            Alert.alert("Error", "Please fill in all required fields");
            return;
        }

        setLoading(true);
        try {
            addDocument({
                propertyId: selectedProperty._id,
                propertyName: selectedProperty.title,
                name: name.trim(),
                type,
            });
            Alert.alert("Success", "Document uploaded successfully", [
                { text: "OK", onPress: () => router.back() },
            ]);
        } catch (err) {
            Alert.alert("Error", "Failed to upload document");
        } finally {
            setLoading(false);
        }
    };

    const types = ["Lease Agreement", "ID Proof", "Other"];

    return (
        <View style={styles.container}>
            <TopBar title="Upload Document" showBack />

            <ScrollView contentContainerStyle={styles.form}>
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
