import React, { useContext, useEffect, useState } from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PropertyContext } from "../../../context/PropertyContext";
import { TopBar } from "../../../components/TopBar";
import { COLORS } from "../../../constants/theme";

export default function PropertyList() {
    const { properties, fetchProperties, loading } = useContext(PropertyContext);
    const [searchQuery, setSearchQuery] = useState("");
    const [filter, setFilter] = useState("all");
    const router = useRouter();

    useEffect(() => {
        fetchProperties();
    }, []);

    const filteredProperties = properties.filter((property) => {
        const matchesSearch =
            property.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            property.address.toLowerCase().includes(searchQuery.toLowerCase());
        const status = property.status || "vacant"; // Handle missing status
        const matchesFilter = filter === "all" || status === filter;
        return matchesSearch && matchesFilter;
    });

    const renderItem = ({ item }) => {
        const status = item.status || "vacant";
        const statusColor =
            status === "occupied"
                ? { bg: "#DCFCE7", text: "#166534" }
                : { bg: "#FEF9C3", text: "#854D0E" };

        return (
            <TouchableOpacity
                className="bg-card rounded-xl border border-border p-4 mb-3"
                onPress={() => router.push(`/landlord/properties/${item._id}`)}
            >
                <View className="flex-row justify-between items-start mb-3">
                    <View>
                        <Text className="text-base font-semibold text-foreground mb-1">{item.title}</Text>
                        <View className="flex-row items-center gap-1">
                            <Ionicons name="location-outline" size={12} color={COLORS.mutedForeground} />
                            <Text className="text-sm text-mutedForeground">{item.address}</Text>
                        </View>
                    </View>
                    <View className="px-2.5 py-1 rounded-xl" style={{ backgroundColor: statusColor.bg }}>
                        <Text className="text-xs font-semibold capitalize" style={{ color: statusColor.text }}>
                            {status}
                        </Text>
                    </View>
                </View>

                <View className="flex-row items-center gap-4">
                    <View className="flex-row items-center gap-1.5">
                        <Ionicons name="business-outline" size={14} color={COLORS.mutedForeground} />
                        <Text className="text-sm text-mutedForeground">{item.units || 1} units</Text>
                    </View>
                    <View className="flex-row items-center gap-1.5">
                        <Ionicons name="people-outline" size={14} color={COLORS.mutedForeground} />
                        <Text className="text-sm text-mutedForeground">{item.tenants || 0} tenants</Text>
                    </View>
                    <View className="bg-muted px-2 py-0.5 rounded ml-auto">
                        <Text className="text-xs text-mutedForeground">{item.type}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View className="flex-1 bg-background">
            <TopBar title="Properties" showBack />

            <View className="px-4 pb-3">
                {/* Search */}
                <View className="flex-row items-center bg-input rounded-xl border border-border px-3 mb-3">
                    <Ionicons
                        name="search"
                        size={16}
                        color={COLORS.mutedForeground}
                        className="mr-2"
                    />
                    <TextInput
                        className="flex-1 h-11 text-foreground"
                        placeholder="Search properties..."
                        placeholderTextColor={COLORS.mutedForeground}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {/* Filters */}
                <View className="flex-row gap-2">
                    {["all", "occupied", "vacant"].map((f) => (
                        <TouchableOpacity
                            key={f}
                            className={`px-4 py-2 rounded-full ${filter === f ? "bg-primary" : "bg-muted"
                                }`}
                            onPress={() => setFilter(f)}
                        >
                            <Text
                                className={`text-sm font-medium capitalize ${filter === f ? "text-white" : "text-mutedForeground"
                                    }`}
                            >
                                {f}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={COLORS.primary} className="mt-5" />
            ) : (
                <FlatList
                    data={filteredProperties}
                    keyExtractor={(item) => item._id}
                    renderItem={renderItem}
                    contentContainerClassName="p-4 pt-0"
                    ListEmptyComponent={
                        <View className="items-center justify-center pt-16">
                            <Ionicons name="business" size={48} color={COLORS.border} />
                            <Text className="text-lg font-bold text-foreground mt-4 mb-2">No properties yet</Text>
                            <Text className="text-center text-mutedForeground px-10">
                                Add your first property to start managing your rentals
                            </Text>
                        </View>
                    }
                />
            )}

            <TouchableOpacity
                className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-primary items-center justify-center shadow-lg shadow-primary"
                onPress={() => router.push("/landlord/properties/add")}
            >
                <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
        </View>
    );
}
