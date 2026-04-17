import React, { useState, useCallback } from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TopBar } from "../../../components/TopBar";
import { COLORS } from "../../../constants/theme";
import { getUnits } from "../../../api/units";

export default function UnitsList() {
    const { propertyId } = useLocalSearchParams();
    const router = useRouter();
    const [units, setUnits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchUnits = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getUnits(propertyId);
            setUnits(data);
        } catch (e) {
            setError(e?.response?.data?.message || e?.message || "Failed to load units");
        } finally {
            setLoading(false);
        }
    }, [propertyId]);

    useFocusEffect(
        useCallback(() => {
            void fetchUnits();
        }, [fetchUnits])
    );

    const renderItem = ({ item, index }) => {
        const isOccupied = item.status === "occupied";
        return (
            <TouchableOpacity
                onPress={() => router.push(`/landlord/units/${item._id}?propertyId=${propertyId}`)}
                activeOpacity={0.8}
                style={{
                    backgroundColor: COLORS.card,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    padding: 16,
                    marginBottom: 12,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.25,
                    shadowRadius: 4,
                    elevation: 1,
                }}
            >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={{ fontSize: 15, fontWeight: "700", color: COLORS.foreground, marginBottom: 4, letterSpacing: -0.1 }}>
                            {item.unitName}
                        </Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Ionicons name="layers-outline" size={13} color={COLORS.mutedForeground} />
                            <Text style={{ fontSize: 13, color: COLORS.mutedForeground }}>
                                Floor {item.floorNumber}
                            </Text>
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

                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <Ionicons name="cash-outline" size={14} color={COLORS.mutedForeground} />
                    <Text style={{ fontSize: 13, color: COLORS.mutedForeground }}>
                        NPR {Number(item.baseRent || 0).toLocaleString()} / month
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: COLORS.background }}>
            <TopBar title="Units" showBack />

            {loading ? (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : error ? (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 }}>
                    <Ionicons name="alert-circle-outline" size={48} color={COLORS.border} />
                    <Text style={{ color: COLORS.mutedForeground, marginTop: 12, textAlign: "center" }}>{error}</Text>
                    <TouchableOpacity
                        onPress={fetchUnits}
                        style={{ marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: COLORS.primary, borderRadius: 10 }}
                    >
                        <Text style={{ color: "#fff", fontWeight: "600" }}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    style={{ flex: 1 }}
                    data={units}
                    keyExtractor={(item) => item._id}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 120 }}
                    ListEmptyComponent={
                        <View style={{ alignItems: "center", paddingTop: 60 }}>
                            <Ionicons name="business-outline" size={48} color={COLORS.border} />
                            <Text style={{ color: COLORS.mutedForeground, marginTop: 12 }}>No units yet</Text>
                            <Text style={{ color: COLORS.faintForeground, fontSize: 13, marginTop: 4 }}>
                                Add your first unit to this property
                            </Text>
                        </View>
                    }
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* FAB */}
            <TouchableOpacity
                onPress={() => router.push(`/landlord/units/add?propertyId=${propertyId}`)}
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
