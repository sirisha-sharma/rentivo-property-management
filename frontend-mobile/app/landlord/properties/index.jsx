import React, { useContext, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PropertyContext } from "../../../context/PropertyContext";
import { TopBar } from "../../../components/TopBar";
import { StatusBadge } from "../../../components/StatusBadge";
import { SearchBar } from "../../../components/SearchBar";
import { FilterChips } from "../../../components/FilterChips";
import { EmptyState } from "../../../components/EmptyState";
import { COLORS } from "../../../constants/theme";

const FILTERS = [
    { key: "all", label: "All" },
    { key: "occupied", label: "Occupied" },
    { key: "vacant", label: "Vacant" },
];

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
        const status = property.status || "vacant";
        const matchesFilter = filter === "all" || status === filter;
        return matchesSearch && matchesFilter;
    });

    const renderItem = ({ item }) => {
        const status = item.status || "vacant";

        return (
            <TouchableOpacity
                onPress={() => router.push(`/landlord/properties/${item._id}`)}
                activeOpacity={0.8}
                style={{
                    backgroundColor: COLORS.card,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    padding: 16,
                    marginBottom: 12,
                    shadowColor: "#0F172A",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.04,
                    shadowRadius: 4,
                    elevation: 1,
                }}
            >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={{ fontSize: 15, fontWeight: "700", color: COLORS.foreground, marginBottom: 4, letterSpacing: -0.1 }}>
                            {item.title}
                        </Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Ionicons name="location-outline" size={13} color={COLORS.mutedForeground} />
                            <Text style={{ fontSize: 13, color: COLORS.mutedForeground }} numberOfLines={1}>
                                {item.address}
                            </Text>
                        </View>
                    </View>
                    <StatusBadge status={status} />
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                        <Ionicons name="business-outline" size={14} color={COLORS.mutedForeground} />
                        <Text style={{ fontSize: 13, color: COLORS.mutedForeground }}>{item.units || 1} units</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                        <Ionicons name="people-outline" size={14} color={COLORS.mutedForeground} />
                        <Text style={{ fontSize: 13, color: COLORS.mutedForeground }}>{item.tenants || 0} tenants</Text>
                    </View>
                    {item.type && (
                        <View style={{ marginLeft: "auto", backgroundColor: COLORS.muted, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                            <Text style={{ fontSize: 12, color: COLORS.mutedForeground, fontWeight: "500" }}>{item.type}</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: COLORS.background }}>
            <TopBar title="Properties" showBack />

            <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search properties…"
                style={{ marginHorizontal: 16, marginTop: 12 }}
            />

            <FilterChips
                options={FILTERS}
                selected={filter}
                onSelect={setFilter}
            />

            {loading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={filteredProperties}
                    keyExtractor={(item) => item._id}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
                    ListEmptyComponent={
                        <EmptyState
                            icon="business-outline"
                            title="No properties yet"
                            subtitle="Add your first property to start managing your rentals"
                        />
                    }
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* FAB */}
            <TouchableOpacity
                onPress={() => router.push("/landlord/properties/add")}
                activeOpacity={0.85}
                style={{
                    position: "absolute",
                    bottom: 24,
                    right: 20,
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: COLORS.primary,
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: COLORS.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.35,
                    shadowRadius: 10,
                    elevation: 6,
                }}
            >
                <Ionicons name="add" size={26} color="#fff" />
            </TouchableOpacity>
        </View>
    );
}
