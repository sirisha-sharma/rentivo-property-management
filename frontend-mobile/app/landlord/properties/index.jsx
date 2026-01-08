import React, { useContext, useEffect, useState } from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
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
                style={styles.card}
                onPress={() => router.push(`/landlord/properties/${item._id}`)}
            >
                <View style={styles.cardHeader}>
                    <View>
                        <Text style={styles.cardTitle}>{item.title}</Text>
                        <View style={styles.locationContainer}>
                            <Ionicons name="location-outline" size={12} color={COLORS.mutedForeground} />
                            <Text style={styles.cardAddress}>{item.address}</Text>
                        </View>
                    </View>
                    <View style={[styles.badge, { backgroundColor: statusColor.bg }]}>
                        <Text style={[styles.badgeText, { color: statusColor.text }]}>
                            {status}
                        </Text>
                    </View>
                </View>

                <View style={styles.cardFooter}>
                    <View style={styles.statItem}>
                        <Ionicons name="business-outline" size={14} color={COLORS.mutedForeground} />
                        <Text style={styles.statText}>{item.units || 1} units</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Ionicons name="people-outline" size={14} color={COLORS.mutedForeground} />
                        <Text style={styles.statText}>{item.tenants || 0} tenants</Text>
                    </View>
                    <View style={styles.typeBadge}>
                        <Text style={styles.typeText}>{item.type}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <TopBar title="Properties" showBack />

            <View style={styles.header}>
                {/* Search */}
                <View style={styles.searchContainer}>
                    <Ionicons
                        name="search"
                        size={16}
                        color={COLORS.mutedForeground}
                        style={styles.searchIcon}
                    />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search properties..."
                        placeholderTextColor={COLORS.mutedForeground}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {/* Filters */}
                <View style={styles.filterContainer}>
                    {["all", "occupied", "vacant"].map((f) => (
                        <TouchableOpacity
                            key={f}
                            style={[
                                styles.filterChip,
                                filter === f && styles.filterChipActive,
                            ]}
                            onPress={() => setFilter(f)}
                        >
                            <Text
                                style={[
                                    styles.filterText,
                                    filter === f && styles.filterTextActive,
                                ]}
                            >
                                {f}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={filteredProperties}
                    keyExtractor={(item) => item._id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="business" size={48} color={COLORS.border} />
                            <Text style={styles.emptyTitle}>No properties yet</Text>
                            <Text style={styles.emptyText}>
                                Add your first property to start managing your rentals
                            </Text>
                        </View>
                    }
                />
            )}

            <TouchableOpacity
                style={styles.fab}
                onPress={() => router.push("/landlord/properties/add")}
            >
                <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.input,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: 12,
        marginBottom: 12,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        height: 44,
        color: COLORS.foreground,
    },
    filterContainer: {
        flexDirection: "row",
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: COLORS.muted,
    },
    filterChipActive: {
        backgroundColor: COLORS.primary,
    },
    filterText: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.mutedForeground,
        textTransform: "capitalize",
    },
    filterTextActive: {
        color: "#fff",
    },
    listContent: {
        padding: 16,
        paddingTop: 0,
    },
    card: {
        backgroundColor: COLORS.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 16,
        marginBottom: 12,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.foreground,
        marginBottom: 4,
    },
    locationContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    cardAddress: {
        fontSize: 14,
        color: COLORS.mutedForeground,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: "600",
        textTransform: "capitalize",
    },
    cardFooter: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
    },
    statItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    statText: {
        fontSize: 14,
        color: COLORS.mutedForeground,
    },
    typeBadge: {
        backgroundColor: COLORS.muted,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: "auto",
    },
    typeText: {
        fontSize: 12,
        color: COLORS.mutedForeground,
    },
    fab: {
        position: "absolute",
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.primary,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 60,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: COLORS.foreground,
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        textAlign: "center",
        color: COLORS.mutedForeground,
        paddingHorizontal: 40,
    },
});
