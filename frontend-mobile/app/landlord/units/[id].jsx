import React, { useState, useCallback } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TopBar } from "../../../components/TopBar";
import { COLORS } from "../../../constants/theme";
import { getUnits, updateUnit, deleteUnit } from "../../../api/units";

export default function UnitDetails() {
    const { id, propertyId } = useLocalSearchParams();
    const router = useRouter();

    const [unit, setUnit] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState(null);

    const [formData, setFormData] = useState({
        unitName: "",
        floorNumber: "",
        baseRent: "",
        description: "",
    });
    const [errors, setErrors] = useState({});

    const fetchUnit = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const units = await getUnits(propertyId);
            const found = units.find((u) => u._id === id);
            if (!found) throw new Error("Unit not found");
            setUnit(found);
            setFormData({
                unitName: found.unitName || "",
                floorNumber: String(found.floorNumber ?? ""),
                baseRent: String(found.baseRent ?? ""),
                description: found.description || "",
            });
        } catch (e) {
            setError(e?.response?.data?.message || e?.message || "Failed to load unit");
        } finally {
            setLoading(false);
        }
    }, [id, propertyId]);

    useFocusEffect(
        useCallback(() => {
            void fetchUnit();
        }, [fetchUnit])
    );

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
        setSaving(true);
        try {
            await updateUnit(id, {
                unitName: formData.unitName.trim(),
                floorNumber: parseInt(formData.floorNumber, 10),
                baseRent: parseFloat(formData.baseRent),
                description: formData.description.trim() || undefined,
            });
            setIsEditing(false);
            await fetchUnit();
            Alert.alert("Success", "Unit updated successfully");
        } catch (e) {
            Alert.alert("Error", e?.response?.data?.message || e?.message || "Failed to update unit");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            "Delete Unit",
            "Are you sure you want to delete this unit? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        setDeleting(true);
                        try {
                            await deleteUnit(id);
                            router.replace(`/landlord/units?propertyId=${propertyId}`);
                        } catch (e) {
                            Alert.alert("Error", e?.response?.data?.message || e?.message || "Failed to delete unit");
                            setDeleting(false);
                        }
                    },
                },
            ]
        );
    };

    if (loading) {
        return (
            <View className="flex-1 bg-background justify-center items-center">
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (error || !unit) {
        return (
            <View className="flex-1 bg-background justify-center items-center px-6">
                <Ionicons name="alert-circle-outline" size={48} color={COLORS.border} />
                <Text className="text-base text-mutedForeground mt-3 text-center">{error || "Unit not found"}</Text>
                <TouchableOpacity className="mt-4 px-6 py-2.5 bg-primary rounded-lg" onPress={() => router.back()}>
                    <Text className="text-white font-semibold">Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const isOccupied = unit.status === "occupied";

    return (
        <View className="flex-1 bg-background">
            <TopBar title="Unit Details" showBack />

            <ScrollView contentContainerClassName="p-4">
                {/* Header Card */}
                <View className="bg-card rounded-xl border border-border p-4 mb-4">
                    <View className="flex-row justify-between items-start mb-3">
                        <View className="flex-1 mr-3">
                            <Text className="text-lg font-bold text-foreground">{unit.unitName}</Text>
                            <View className="flex-row items-center gap-1 mt-1">
                                <Ionicons name="layers-outline" size={12} color={COLORS.mutedForeground} />
                                <Text className="text-sm text-mutedForeground">Floor {unit.floorNumber}</Text>
                            </View>
                        </View>
                        <View
                            style={{
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                                borderRadius: 999,
                                backgroundColor: isOccupied ? COLORS.warningSoft : COLORS.successSoft,
                            }}
                        >
                            <Text style={{ fontSize: 12, fontWeight: "600", color: isOccupied ? COLORS.warning : COLORS.success }}>
                                {isOccupied ? "Occupied" : "Vacant"}
                            </Text>
                        </View>
                    </View>

                    <View className="flex-row items-center gap-2">
                        <Ionicons name="cash-outline" size={16} color={COLORS.success} />
                        <Text className="text-sm font-semibold text-foreground">
                            NPR {Number(unit.baseRent || 0).toLocaleString()} / month
                        </Text>
                    </View>

                    {unit.description ? (
                        <Text className="text-sm text-mutedForeground mt-2">{unit.description}</Text>
                    ) : null}
                </View>

                {/* Edit / Delete actions */}
                <View className="flex-row gap-3 mb-4">
                    <TouchableOpacity
                        onPress={() => setIsEditing((prev) => !prev)}
                        style={{
                            flex: 1,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            paddingVertical: 10,
                            borderRadius: 10,
                            backgroundColor: COLORS.primarySoft,
                            borderWidth: 1,
                            borderColor: "rgba(47,123,255,0.35)",
                        }}
                    >
                        <Ionicons name={isEditing ? "close-outline" : "create-outline"} size={18} color={COLORS.primary} />
                        <Text style={{ color: COLORS.primary, fontWeight: "600" }}>{isEditing ? "Cancel" : "Edit"}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={handleDelete}
                        disabled={deleting}
                        style={{
                            flex: 1,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            paddingVertical: 10,
                            borderRadius: 10,
                            backgroundColor: COLORS.destructiveSoft,
                            borderWidth: 1,
                            borderColor: "rgba(239,68,68,0.35)",
                        }}
                    >
                        {deleting ? (
                            <ActivityIndicator size="small" color={COLORS.destructive} />
                        ) : (
                            <>
                                <Ionicons name="trash-outline" size={18} color={COLORS.destructive} />
                                <Text style={{ color: COLORS.destructive, fontWeight: "600" }}>Delete</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Edit Form */}
                {isEditing && (
                    <View className="bg-card rounded-xl border border-border p-4 gap-4 mb-4">
                        <Text className="text-sm font-semibold text-foreground">Edit Unit</Text>

                        <View className="gap-2">
                            <Text className="text-sm font-medium text-foreground">Unit Name</Text>
                            <TextInput
                                className={`h-12 border rounded-lg px-4 text-base bg-input text-foreground ${errors.unitName ? "border-destructive" : "border-border"}`}
                                placeholder="e.g. Unit 101"
                                value={formData.unitName}
                                onChangeText={(v) => updateField("unitName", v)}
                                placeholderTextColor={COLORS.mutedForeground}
                            />
                            {errors.unitName && <Text className="text-xs text-destructive">{errors.unitName}</Text>}
                        </View>

                        <View className="gap-2">
                            <Text className="text-sm font-medium text-foreground">Floor Number</Text>
                            <TextInput
                                className={`h-12 border rounded-lg px-4 text-base bg-input text-foreground ${errors.floorNumber ? "border-destructive" : "border-border"}`}
                                placeholder="e.g. 2"
                                value={formData.floorNumber}
                                onChangeText={(v) => updateField("floorNumber", v)}
                                keyboardType="number-pad"
                                placeholderTextColor={COLORS.mutedForeground}
                            />
                            {errors.floorNumber && <Text className="text-xs text-destructive">{errors.floorNumber}</Text>}
                        </View>

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

                        <View className="gap-2">
                            <Text className="text-sm font-medium text-foreground">
                                Description <Text className="text-mutedForeground font-normal">(optional)</Text>
                            </Text>
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

                        <TouchableOpacity
                            className="h-12 items-center justify-center rounded-lg bg-primary"
                            onPress={handleSave}
                            disabled={saving}
                        >
                            {saving ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-base text-white font-semibold">Save Changes</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
