import React, { useEffect, useState, useContext } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TopBar } from "../../../components/TopBar";
import { StatusBadge } from "../../../components/StatusBadge";
import { COLORS } from "../../../constants/theme";
import { PropertyContext } from "../../../context/PropertyContext";
import { TenantContext } from "../../../context/TenantContext";

// Placeholder for now as we don't have maintenance context yet
const maintenanceRequests = [
    { id: 1, issue: "Plumbing", status: "in-progress", date: "Dec 20, 2024" },
    { id: 2, issue: "Electricity", status: "submitted", date: "Dec 22, 2024" },
];

export default function PropertyDetails() {
    const { id } = useLocalSearchParams();
    const router = useRouter();

    const [property, setProperty] = useState(null);
    const [loading, setLoading] = useState(true);
    const { tenants, fetchTenants } = useContext(TenantContext);
    const { getPropertyById, deleteProperty } = useContext(PropertyContext);

    useEffect(() => {
        fetchTenants();
        const fetchPropertyDetails = async () => {
            try {
                const data = await getPropertyById(id);
                setProperty(data);
            } catch (e) {
                console.log(e);
            } finally {
                setLoading(false);
            }
        };
        fetchPropertyDetails();
    }, [id]);

    const propertyTenants = tenants.filter(t => t.propertyId?._id === id || t.propertyId === id);

    const handleDelete = () => {
        Alert.alert(
            "Delete Property",
            "Are you sure you want to delete this property? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteProperty(id);
                            router.replace("/landlord/properties");
                        } catch (e) {
                            Alert.alert("Error", "Failed to delete property");
                        }
                    },
                },
            ]
        );
    };

    const handleEdit = () => {
        router.push(`/landlord/properties/edit?id=${id}`);
    };

    if (loading) {
        return (
            <View className="flex-1 bg-background justify-center items-center">
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (!property) {
        return (
            <View className="flex-1 bg-background justify-center items-center">
                <Ionicons name="alert-circle-outline" size={48} color={COLORS.border} />
                <Text className="text-base text-mutedForeground mt-3">Property not found</Text>
                <TouchableOpacity className="mt-4 px-6 py-2.5 bg-primary rounded-lg" onPress={() => router.back()}>
                    <Text className="text-white font-semibold">Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-background">
            <TopBar title="Property Details" showBack />

            <ScrollView contentContainerClassName="p-4">
                {/* Property Images */}
                {property.images && property.images.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                        {property.images.map((img, index) => (
                            <Image key={index} source={{ uri: img }} className="w-52 h-36 rounded-xl mr-3" />
                        ))}
                    </ScrollView>
                )}

                {/* Header Card */}
                <View className="bg-card rounded-xl border border-border p-4 mb-4">
                    <View className="flex-row justify-between items-start mb-3">
                        <View>
                            <Text className="text-lg font-bold text-foreground">{property.title}</Text>
                            <View className="flex-row items-center gap-1 mt-1">
                                <Ionicons name="location-outline" size={12} color={COLORS.mutedForeground} />
                                <Text className="text-sm text-mutedForeground">{property.address}</Text>
                            </View>
                        </View>
                        <StatusBadge status={property.status || "vacant"} />
                    </View>

                    <View className="flex-row gap-2">
                        <View className="bg-muted px-2 py-1 rounded">
                            <Text className="text-xs text-mutedForeground">{property.type}</Text>
                        </View>
                        <View className="bg-muted px-2 py-1 rounded">
                            <Text className="text-xs text-mutedForeground">{property.units} Units</Text>
                        </View>
                    </View>
                </View>

                {/* Edit/Delete Actions */}
                <View className="flex-row gap-3 mb-4">
                    <TouchableOpacity className="flex-1 flex-row items-center justify-center py-2.5 rounded-lg gap-1.5 bg-blue-50 border border-primary" onPress={handleEdit}>
                        <Ionicons name="create-outline" size={18} color={COLORS.primary} />
                        <Text className="text-primary font-semibold">Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="flex-1 flex-row items-center justify-center py-2.5 rounded-lg gap-1.5 bg-red-50 border border-red-500" onPress={handleDelete}>
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        <Text className="text-red-500 font-semibold">Delete</Text>
                    </TouchableOpacity>
                </View>

                {/* Stats */}
                <View className="flex-row gap-3 mb-4">
                    <View className="flex-1 bg-card rounded-xl border border-border p-3 items-center">
                        <Ionicons name="people" size={20} color={COLORS.primary} />
                        <Text className="text-lg font-bold text-foreground my-1">{propertyTenants.length}</Text>
                        <Text className="text-[10px] text-mutedForeground">Tenants</Text>
                    </View>
                    <View className="flex-1 bg-card rounded-xl border border-border p-3 items-center">
                        <Ionicons name="cash-outline" size={20} color={COLORS.success} />
                        <Text className="text-lg font-bold text-foreground my-1">-</Text>
                        <Text className="text-[10px] text-mutedForeground">Monthly</Text>
                    </View>
                    <View className="flex-1 bg-card rounded-xl border border-border p-3 items-center">
                        <Ionicons name="construct-outline" size={20} color={COLORS.warning} />
                        <Text className="text-lg font-bold text-foreground my-1">2</Text>
                        <Text className="text-[10px] text-mutedForeground">Issues</Text>
                    </View>
                </View>

                {/* Amenities */}
                {property.amenities && property.amenities.length > 0 && (
                    <View className="bg-card rounded-xl border border-border p-4 mb-4">
                        <Text className="text-sm font-semibold text-foreground mb-2">Amenities</Text>
                        <View className="flex-row flex-wrap gap-2">
                            {property.amenities.map((amenity, idx) => (
                                <View key={idx} className="bg-muted px-2.5 py-1.5 rounded">
                                    <Text className="text-xs text-foreground">{amenity}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Tenants Section */}
                <View className="flex-row justify-between items-center mb-3">
                    <Text className="text-sm font-semibold text-foreground">Current Tenants</Text>
                    <TouchableOpacity
                        onPress={() => router.push("/landlord/tenants/invite")}
                        className="flex-row items-center py-1"
                    >
                        <Ionicons name="add" size={16} color={COLORS.foreground} />
                        <Text className="text-xs font-medium ml-1">Add Tenant</Text>
                    </TouchableOpacity>
                </View>

                <View className="bg-card rounded-xl border border-border mb-4 overflow-hidden">
                    {propertyTenants.length === 0 ? (
                        <Text className="p-4 text-center text-mutedForeground">No tenants yet</Text>
                    ) : propertyTenants.map((t, index) => (
                        <View key={t._id} className={`p-3 flex-row justify-between ${index !== propertyTenants.length - 1 ? 'border-b border-border' : ''}`}>
                            <View>
                                <Text className="text-sm font-medium text-foreground">{t.userId?.name || "Pending User"}</Text>
                                <Text className="text-xs text-mutedForeground">{t.leaseEnd ? `Lease ends: ${new Date(t.leaseEnd).toLocaleDateString()}` : "Active"}</Text>
                            </View>
                            <View className="items-end">
                                <StatusBadge status={t.status?.toLowerCase() || "active"} />
                                <View className="flex-row items-center gap-1 justify-end mt-1">
                                    <Ionicons name="call-outline" size={12} color={COLORS.mutedForeground} />
                                    <Text className="text-xs text-mutedForeground">{t.userId?.phone || "-"}</Text>
                                </View>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Utility Config */}
                <View className="bg-card rounded-xl border border-border p-4 mb-4">
                    <Text className="text-sm font-semibold text-foreground mb-2">Utility Configuration</Text>
                    <Text className="text-sm text-mutedForeground">
                        Split Method: <Text className="font-semibold text-foreground">{property.splitMethod}</Text>
                    </Text>
                </View>

                {/* Recent Maintenance */}
                <View className="flex-row justify-between items-center mb-3">
                    <Text className="text-sm font-semibold text-foreground">Recent Maintenance</Text>
                    <TouchableOpacity><Text className="text-xs text-primary font-medium">View all</Text></TouchableOpacity>
                </View>

                <View className="gap-2 mb-4">
                    {maintenanceRequests.map((req) => (
                        <View key={req.id} className="bg-card rounded-xl border border-border p-3 flex-row justify-between items-center">
                            <View>
                                <Text className="text-sm font-medium text-foreground">{req.issue}</Text>
                                <Text className="text-xs text-mutedForeground">{req.date}</Text>
                            </View>
                            <StatusBadge status={req.status} />
                        </View>
                    ))}
                </View>

                {/* Actions */}
                <View className="flex-row gap-2">
                    <TouchableOpacity className="flex-1 h-11 rounded-lg items-center justify-center flex-row gap-2 bg-primary">
                        <Ionicons name="document-text-outline" size={18} color="white" />
                        <Text className="text-white font-semibold">Generate Invoice</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="flex-1 h-11 rounded-lg items-center justify-center flex-row gap-2 border border-border">
                        <Text className="text-foreground font-semibold">View Invoices</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </View>
    );
}
