import React, { useState, useContext } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
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

    // Simple selector component
    const Selector = ({ label, value, options, onSelect, error }) => (
        <View className="gap-2">
            <Text className="text-sm font-medium text-foreground">{label}</Text>
            <View className="flex-row flex-wrap gap-2">
                {options.map((opt) => (
                    <TouchableOpacity
                        key={opt.value}
                        className={`px-4 py-2.5 rounded-lg border ${value === opt.value
                                ? "bg-card border-primary"
                                : "bg-muted border-transparent"
                            }`}
                        onPress={() => onSelect(opt.value)}
                    >
                        <Text
                            className={`text-sm ${value === opt.value
                                    ? "text-primary font-semibold"
                                    : "text-mutedForeground"
                                }`}
                        >
                            {opt.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            {error && <Text className="text-xs text-destructive">{error}</Text>}
        </View>
    );

    return (
        <View className="flex-1 bg-background">
            <TopBar title="Add Property" showBack />

            <ScrollView contentContainerClassName="p-4 gap-4">
                <View className="gap-2">
                    <Text className="text-sm font-medium text-foreground">Property Name</Text>
                    <TextInput
                        className={`h-12 border rounded-lg px-4 text-base bg-input text-foreground ${errors.title ? "border-destructive" : "border-border"
                            }`}
                        placeholder="e.g. Sunrise Apartments"
                        value={formData.title}
                        onChangeText={(text) => updateField("title", text)}
                        placeholderTextColor={COLORS.mutedForeground}
                    />
                    {errors.title && <Text className="text-xs text-destructive">{errors.title}</Text>}
                </View>

                <View className="gap-2">
                    <Text className="text-sm font-medium text-foreground">Address</Text>
                    <TextInput
                        className={`h-12 border rounded-lg px-4 text-base bg-input text-foreground ${errors.address ? "border-destructive" : "border-border"
                            }`}
                        placeholder="e.g. Thamel, Kathmandu"
                        value={formData.address}
                        onChangeText={(text) => updateField("address", text)}
                        placeholderTextColor={COLORS.mutedForeground}
                    />
                    {errors.address && <Text className="text-xs text-destructive">{errors.address}</Text>}
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

                <View className="gap-2">
                    <Text className="text-sm font-medium text-foreground">Number of Units/Rooms</Text>
                    <TextInput
                        className={`h-12 border rounded-lg px-4 text-base bg-input text-foreground ${errors.units ? "border-destructive" : "border-border"
                            }`}
                        placeholder="e.g. 4"
                        value={formData.units}
                        onChangeText={(text) => updateField("units", text)}
                        keyboardType="number-pad"
                        placeholderTextColor={COLORS.mutedForeground}
                    />
                    {errors.units && <Text className="text-xs text-destructive">{errors.units}</Text>}
                </View>

                <View className="h-px bg-border my-2" />

                <Text className="text-base font-semibold text-foreground">Utility Configuration</Text>

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
                    <View className="bg-muted p-4 rounded-xl gap-3">
                        <Text className="text-xs text-mutedForeground">Enter room sizes in sq. ft.</Text>
                        {roomSizes.map((room, index) => (
                            <View key={index} className="flex-row gap-2 items-center">
                                <TextInput
                                    className="flex-1 bg-card h-10 px-3 rounded border border-border"
                                    value={room.name}
                                    onChangeText={(text) => updateRoom(index, "name", text)}
                                />
                                <TextInput
                                    className={`w-20 bg-card h-10 px-3 rounded border ${errors[`room-${index}`] ? "border-destructive" : "border-border"
                                        }`}
                                    placeholder="Size"
                                    value={room.size}
                                    onChangeText={(text) => updateRoom(index, "size", text)}
                                    keyboardType="number-pad"
                                />
                                <TouchableOpacity
                                    onPress={() => removeRoom(index)}
                                    disabled={roomSizes.length === 1}
                                    className="p-2"
                                >
                                    <Ionicons name="trash-outline" size={20} color={COLORS.destructive} />
                                </TouchableOpacity>
                            </View>
                        ))}
                        <TouchableOpacity
                            className="flex-row items-center justify-center p-2.5 border border-border rounded-lg bg-card gap-2"
                            onPress={addRoom}
                        >
                            <Ionicons name="add" size={16} color={COLORS.foreground} />
                            <Text className="text-sm font-medium text-foreground">Add Room</Text>
                        </TouchableOpacity>
                    </View>
                )}

            </ScrollView>

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
                        <Text className="text-base text-white font-semibold">Save Property</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}
