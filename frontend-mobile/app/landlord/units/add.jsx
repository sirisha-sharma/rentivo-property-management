import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TopBar } from "../../../components/TopBar";
import { COLORS } from "../../../constants/theme";
import { createUnit } from "../../../api/units";

export default function AddUnit() {
    const { propertyId } = useLocalSearchParams();
    const router = useRouter();

    const [formData, setFormData] = useState({
        unitName: "",
        floorNumber: "",
        baseRent: "",
        description: "",
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const updateField = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.unitName.trim()) newErrors.unitName = "Unit name is required";
        if (!formData.floorNumber.trim()) newErrors.floorNumber = "Floor number is required";
        if (!formData.baseRent.trim()) newErrors.baseRent = "Base rent is required";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;
        setLoading(true);
        try {
            await createUnit({
                propertyId,
                unitName: formData.unitName.trim(),
                floorNumber: parseInt(formData.floorNumber, 10),
                baseRent: parseFloat(formData.baseRent),
                description: formData.description.trim() || undefined,
            });
            Alert.alert("Success", "Unit added successfully", [
                { text: "OK", onPress: () => router.back() },
            ]);
        } catch (e) {
            Alert.alert("Error", e?.response?.data?.message || e?.message || "Failed to add unit");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-background">
            <TopBar title="Add Unit" showBack />

            <ScrollView contentContainerClassName="p-4 gap-4">
                {/* Info banner */}
                <View className="bg-card border border-border rounded-[24px] p-4 flex-row gap-4 items-start">
                    <View className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/20 items-center justify-center">
                        <Ionicons name="business-outline" size={20} color={COLORS.primary} />
                    </View>
                    <View className="flex-1">
                        <Text className="text-base font-semibold text-foreground">Add a new unit</Text>
                        <Text className="mt-1 text-sm leading-5 text-mutedForeground">
                            Enter the unit details below. You can update occupancy status after adding tenants.
                        </Text>
                    </View>
                </View>

                {/* Unit Name */}
                <View className="gap-2">
                    <Text className="text-sm font-medium text-foreground">Unit Name</Text>
                    <TextInput
                        className={`h-12 border rounded-lg px-4 text-base bg-input text-foreground ${errors.unitName ? "border-destructive" : "border-border"}`}
                        placeholder="e.g. Unit 101, Room A"
                        value={formData.unitName}
                        onChangeText={(v) => updateField("unitName", v)}
                        placeholderTextColor={COLORS.mutedForeground}
                    />
                    {errors.unitName && <Text className="text-xs text-destructive">{errors.unitName}</Text>}
                </View>

                {/* Floor Number */}
                <View className="gap-2">
                    <Text className="text-sm font-medium text-foreground">Floor Number</Text>
                    <TextInput
                        className={`h-12 border rounded-lg px-4 text-base bg-input text-foreground ${errors.floorNumber ? "border-destructive" : "border-border"}`}
                        placeholder="e.g. 1"
                        value={formData.floorNumber}
                        onChangeText={(v) => updateField("floorNumber", v)}
                        keyboardType="number-pad"
                        placeholderTextColor={COLORS.mutedForeground}
                    />
                    {errors.floorNumber && <Text className="text-xs text-destructive">{errors.floorNumber}</Text>}
                </View>

                {/* Base Rent */}
                <View className="gap-2">
                    <Text className="text-sm font-medium text-foreground">Base Rent (NPR)</Text>
                    <TextInput
                        className={`h-12 border rounded-lg px-4 text-base bg-input text-foreground ${errors.baseRent ? "border-destructive" : "border-border"}`}
                        placeholder="e.g. 15000"
                        value={formData.baseRent}
                        onChangeText={(v) => updateField("baseRent", v)}
                        keyboardType="decimal-pad"
                        placeholderTextColor={COLORS.mutedForeground}
                    />
                    {errors.baseRent && <Text className="text-xs text-destructive">{errors.baseRent}</Text>}
                </View>

                {/* Description */}
                <View className="gap-2">
                    <Text className="text-sm font-medium text-foreground">Description <Text className="text-mutedForeground font-normal">(optional)</Text></Text>
                    <TextInput
                        className="min-h-24 border rounded-lg px-4 py-3 text-base bg-input text-foreground border-border"
                        placeholder="Additional details about this unit"
                        value={formData.description}
                        onChangeText={(v) => updateField("description", v)}
                        placeholderTextColor={COLORS.mutedForeground}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />
                </View>
            </ScrollView>

            {/* Footer actions */}
            <View className="p-4 border-t border-border flex-row gap-3 bg-background">
                <TouchableOpacity
                    className="flex-1 h-12 items-center justify-center rounded-lg border border-border"
                    onPress={() => router.back()}
                >
                    <Text className="text-base text-foreground font-medium">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    className="flex-1 h-12 items-center justify-center rounded-lg bg-primary"
                    onPress={handleSave}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-base text-white font-semibold">Save Unit</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}
