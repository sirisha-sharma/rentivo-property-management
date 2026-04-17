import React, { useState, useContext } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { PropertyContext } from "../../../context/PropertyContext";
import { SubscriptionContext } from "../../../context/SubscriptionContext";
import { TopBar } from "../../../components/TopBar";
import { SubscriptionGateBanner } from "../../../components/SubscriptionGateBanner";
import { COLORS } from "../../../constants/theme";
import { BASE_URL } from "../../../constants/config";
import {
    SUBSCRIPTION_ACTIONS,
    getSubscriptionActionAccess,
    getSubscriptionActionPrompt,
    getSubscriptionErrorPayload,
    isSubscriptionErrorPayload,
} from "../../../utils/subscription";

export default function AddProperty() {
    const { addProperty } = useContext(PropertyContext);
    const { subscription, fetchSubscription } = useContext(SubscriptionContext);
    const router = useRouter();

    const [formData, setFormData] = useState({
        title: "",
        address: "",
        type: "",
        units: "",
        splitMethod: "",
        rent: "",
        description: "",
    });

    const [roomSizes, setRoomSizes] = useState([{ name: "Room 1", size: "" }]);
    const [images, setImages] = useState([]);
    const [newImageUrl, setNewImageUrl] = useState("");
    const [amenities, setAmenities] = useState([]);
    const [newAmenity, setNewAmenity] = useState("");
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    useFocusEffect(
        React.useCallback(() => {
            void fetchSubscription();
        }, [fetchSubscription])
    );

    const canAddProperty = getSubscriptionActionAccess(
        subscription,
        SUBSCRIPTION_ACTIONS.ADD_PROPERTY
    );
    const actionPrompt = getSubscriptionActionPrompt({
        subscription,
        action: SUBSCRIPTION_ACTIONS.ADD_PROPERTY,
    });
    const shouldShowBanner = Boolean(
        subscription &&
        (subscription.plan === "trial" ||
            !canAddProperty ||
            ["expired", "cancelled", "pending_payment"].includes(subscription.status))
    );

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

    // Helper function to construct proper image URI
    const getImageUri = (img) => {
        if (!img) return "";
        // If it's already a full URL or local file URI, return as-is
        if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('file://')) {
            return img;
        }
        // Otherwise, it's a server path - prepend BASE_URL (not API_BASE_URL)
        return `${BASE_URL}${img}`;
    };

    const pickImageFromGallery = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("Permission Denied", "Camera roll permissions are required!");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: false,
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setImages((prev) => [...prev, result.assets[0].uri]);
        }
    };

    const addImageFromUrl = () => {
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

        if (formData.splitMethod === "room-size") {
            roomSizes.forEach((room, index) => {
                if (!room.size) newErrors[`room-${index}`] = "Size required";
            });
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!canAddProperty) {
            Alert.alert(actionPrompt.title, actionPrompt.message, [
                { text: "Cancel", style: "cancel" },
                {
                    text: actionPrompt.cta,
                    onPress: () => router.push("/landlord/subscription"),
                },
            ]);
            return;
        }

        if (!validateForm()) return;

        setLoading(true);
        try {
            await addProperty({
                ...formData,
                units: parseInt(formData.units),
                rent: formData.rent ? parseFloat(formData.rent) : 0,
                roomSizes: formData.splitMethod === "room-size" ? roomSizes : [],
                images,
                amenities,
            });
            Alert.alert("Success", "Property added successfully", [
                { text: "OK", onPress: () => router.back() }
            ]);
        } catch (error) {
            const payload = getSubscriptionErrorPayload(error);
            if (isSubscriptionErrorPayload(payload)) {
                Alert.alert(actionPrompt.title, payload.message || actionPrompt.message, [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "View Plans",
                        onPress: () => router.push("/landlord/subscription"),
                    },
                ]);
                return;
            }

            Alert.alert("Error", payload?.message || "Failed to add property");
        } finally {
            setLoading(false);
        }
    };

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
                {shouldShowBanner ? (
                    <SubscriptionGateBanner
                        title={actionPrompt.title}
                        message={actionPrompt.message}
                        actionLabel={actionPrompt.cta}
                        onActionPress={() => router.push("/landlord/subscription")}
                        tone={canAddProperty ? "info" : "warning"}
                    />
                ) : null}

                <View className="bg-card border border-border rounded-[24px] p-4 flex-row gap-4 items-start">
                    <View className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/20 items-center justify-center">
                        <Ionicons name="business-outline" size={20} color={COLORS.primary} />
                    </View>
                    <View className="flex-1">
                        <Text className="text-base font-semibold text-foreground">Build a polished listing</Text>
                        <Text className="mt-1 text-sm leading-5 text-mutedForeground">
                            Add the essentials first, then enrich the property with photos, amenities, and utility setup.
                        </Text>
                    </View>
                </View>

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

                <View className="gap-2">
                    <Text className="text-sm font-medium text-foreground">Description</Text>
                    <TextInput
                        className="min-h-24 border rounded-lg px-4 py-3 text-base bg-input text-foreground border-border"
                        placeholder="Describe your property (optional)"
                        value={formData.description}
                        onChangeText={(text) => updateField("description", text)}
                        placeholderTextColor={COLORS.mutedForeground}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />
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

                <View className="gap-2">
                    <Text className="text-sm font-medium text-foreground">Monthly Rent (NPR)</Text>
                    <TextInput
                        className="h-12 border rounded-lg px-4 text-base bg-input text-foreground border-border"
                        placeholder="e.g. 25000"
                        value={formData.rent}
                        onChangeText={(text) => updateField("rent", text)}
                        keyboardType="number-pad"
                        placeholderTextColor={COLORS.mutedForeground}
                    />
                </View>

                <View className="h-px bg-border my-2" />

                <Text className="text-base font-semibold text-foreground">Property Images</Text>
                <View className="gap-3">
                    {images.length > 0 && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-3">
                            {images.map((img, index) => (
                                <View key={index} className="relative mr-3">
                                    <Image source={{ uri: getImageUri(img) }} className="w-24 h-20 rounded-lg" />
                                    <TouchableOpacity
                                        className="absolute -top-2 -right-2 bg-white rounded-full"
                                        onPress={() => removeImage(index)}
                                    >
                                        <Ionicons name="close-circle" size={24} color={COLORS.destructive} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>
                    )}
                    <View className="flex-row gap-2">
                        <TouchableOpacity
                            className="flex-1 h-12 border border-border rounded-lg bg-card items-center justify-center flex-row gap-2"
                            onPress={pickImageFromGallery}
                        >
                            <Ionicons name="images-outline" size={20} color={COLORS.foreground} />
                            <Text className="text-sm font-medium text-foreground">Pick from Gallery</Text>
                        </TouchableOpacity>
                    </View>
                    <View className="flex-row gap-2">
                        <TextInput
                            className="flex-1 h-12 border rounded-lg px-4 text-base bg-input text-foreground border-border"
                            placeholder="Or paste image URL"
                            value={newImageUrl}
                            onChangeText={setNewImageUrl}
                            placeholderTextColor={COLORS.mutedForeground}
                        />
                        <TouchableOpacity
                            className="w-12 h-12 bg-primary rounded-lg items-center justify-center"
                            onPress={addImageFromUrl}
                        >
                            <Ionicons name="add" size={20} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View className="h-px bg-border my-2" />

                <Text className="text-base font-semibold text-foreground">Amenities</Text>
                <View className="gap-3">
                    {amenities.length > 0 && (
                        <View className="flex-row flex-wrap gap-2">
                            {amenities.map((amenity, index) => (
                                <View key={index} className="flex-row items-center bg-muted px-3 py-2 rounded-lg gap-2">
                                    <Text className="text-sm text-foreground">{amenity}</Text>
                                    <TouchableOpacity onPress={() => removeAmenity(index)}>
                                        <Ionicons name="close" size={16} color={COLORS.mutedForeground} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    )}
                    <View className="flex-row gap-2">
                        <TextInput
                            className="flex-1 h-12 border rounded-lg px-4 text-base bg-input text-foreground border-border"
                            placeholder="e.g. WiFi, Pool, Gym"
                            value={newAmenity}
                            onChangeText={setNewAmenity}
                            placeholderTextColor={COLORS.mutedForeground}
                        />
                        <TouchableOpacity
                            className="w-12 h-12 bg-primary rounded-lg items-center justify-center"
                            onPress={addAmenityItem}
                        >
                            <Ionicons name="add" size={20} color="white" />
                        </TouchableOpacity>
                    </View>
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
                        <Text className="text-base text-white font-semibold">
                            {canAddProperty ? "Save Property" : "Upgrade to Continue"}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}
