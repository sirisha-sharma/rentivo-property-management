import React, { useContext, useEffect, useState, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TopBar } from "../../components/TopBar";
import { StatusBadge } from "../../components/StatusBadge";
import { EmptyState } from "../../components/EmptyState";
import { COLORS } from "../../constants/theme";
import { TenantContext } from "../../context/TenantContext";

export default function MyRentals() {
    const router = useRouter();
    const { invitations, fetchMyInvitations } = useContext(TenantContext);

    const [activeRentals, setActiveRentals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadRentals = useCallback(async () => {
        try {
            setLoading(true);
            // Fetch tenant's own invitation/rental records
            await fetchMyInvitations();
        } catch (error) {
            console.error("Failed to load rentals:", error);
        } finally {
            setLoading(false);
        }
    }, [fetchMyInvitations]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadRentals();
        setRefreshing(false);
    };

    useEffect(() => {
        loadRentals();
    }, [loadRentals]);

    // Filter for active rentals only
    useEffect(() => {
        if (invitations) {
            const active = invitations.filter(tenant => tenant.status === "Active");
            setActiveRentals(active);
        }
    }, [invitations]);

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: COLORS.background }}>
                <TopBar title="My Rentals" showBack />
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: COLORS.background }}>
            <TopBar title="My Rentals" showBack />

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 16 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {activeRentals.length === 0 ? (
                    <EmptyState
                        icon="home-outline"
                        title="No Active Rentals"
                        subtitle="You don't have any active rental properties yet. Check your invitations!"
                    />
                ) : (
                    <View style={{ gap: 16 }}>
                        {activeRentals.map((rental) => (
                            <View
                                key={rental._id}
                                style={{
                                    backgroundColor: COLORS.card,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: COLORS.border,
                                    padding: 16,
                                    gap: 12,
                                }}
                            >
                                {/* Property Header */}
                                <View style={{
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    alignItems: "flex-start"
                                }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{
                                            fontSize: 18,
                                            fontWeight: "600",
                                            color: COLORS.foreground,
                                            marginBottom: 4,
                                        }}>
                                            {rental.propertyId?.title || "Property"}
                                        </Text>
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                            <Ionicons name="location" size={14} color={COLORS.mutedForeground} />
                                            <Text style={{ fontSize: 14, color: COLORS.mutedForeground }}>
                                                {rental.propertyId?.address || "Address not available"}
                                            </Text>
                                        </View>
                                    </View>
                                    <StatusBadge status={rental.status || "Active"} />
                                </View>

                                {/* Property Details */}
                                <View style={{
                                    flexDirection: "row",
                                    flexWrap: "wrap",
                                    gap: 16,
                                    paddingTop: 8,
                                    borderTopWidth: 1,
                                    borderTopColor: COLORS.border,
                                }}>
                                    <View style={{ gap: 4 }}>
                                        <Text style={{ fontSize: 12, color: COLORS.mutedForeground }}>
                                            Property Type
                                        </Text>
                                        <Text style={{ fontSize: 14, fontWeight: "500", color: COLORS.foreground }}>
                                            {rental.propertyId?.type || "N/A"}
                                        </Text>
                                    </View>
                                    <View style={{ gap: 4 }}>
                                        <Text style={{ fontSize: 12, color: COLORS.mutedForeground }}>
                                            Lease Start
                                        </Text>
                                        <Text style={{ fontSize: 14, fontWeight: "500", color: COLORS.foreground }}>
                                            {formatDate(rental.leaseStart)}
                                        </Text>
                                    </View>
                                    <View style={{ gap: 4 }}>
                                        <Text style={{ fontSize: 12, color: COLORS.mutedForeground }}>
                                            Lease End
                                        </Text>
                                        <Text style={{ fontSize: 14, fontWeight: "500", color: COLORS.foreground }}>
                                            {formatDate(rental.leaseEnd)}
                                        </Text>
                                    </View>
                                </View>

                                {/* Utility Split Info */}
                                {rental.propertyId?.splitMethod && (
                                    <View style={{
                                        backgroundColor: COLORS.muted,
                                        padding: 12,
                                        borderRadius: 8,
                                        gap: 4,
                                    }}>
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                            <Ionicons name="flash" size={16} color={COLORS.primary} />
                                            <Text style={{
                                                fontSize: 12,
                                                fontWeight: "600",
                                                color: COLORS.foreground
                                            }}>
                                                Utility Split Method
                                            </Text>
                                        </View>
                                        <Text style={{ fontSize: 14, color: COLORS.mutedForeground }}>
                                            {rental.propertyId.splitMethod === "equal" && "Equal Split"}
                                            {rental.propertyId.splitMethod === "room-size" && "Based on Room Size"}
                                            {rental.propertyId.splitMethod === "occupancy" && "Based on Occupancy"}
                                            {rental.propertyId.splitMethod === "custom" && "Custom Split"}
                                        </Text>
                                    </View>
                                )}

                                {/* Action Buttons */}
                                <View style={{
                                    flexDirection: "row",
                                    gap: 8,
                                    paddingTop: 8,
                                    flexWrap: "wrap",
                                }}>
                                    <TouchableOpacity
                                        style={{
                                            flex: 1,
                                            paddingVertical: 10,
                                            paddingHorizontal: 16,
                                            borderRadius: 8,
                                            backgroundColor: COLORS.primary,
                                            alignItems: "center",
                                        }}
                                        onPress={() => router.push("/tenant/invoices")}
                                    >
                                        <Text style={{ fontSize: 14, fontWeight: "600", color: "#fff" }}>
                                            View Invoices
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={{
                                            flex: 1,
                                            paddingVertical: 10,
                                            paddingHorizontal: 16,
                                            borderRadius: 8,
                                            borderWidth: 1,
                                            borderColor: COLORS.border,
                                            backgroundColor: COLORS.card,
                                            alignItems: "center",
                                        }}
                                        onPress={() => router.push("/tenant/documents")}
                                    >
                                        <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.foreground }}>
                                            Documents
                                        </Text>
                                    </TouchableOpacity>
                                    {rental.propertyId?.landlordId?._id && (
                                        <TouchableOpacity
                                            style={{
                                                flex: 1,
                                                paddingVertical: 10,
                                                paddingHorizontal: 16,
                                                borderRadius: 8,
                                                backgroundColor: "#EFF6FF",
                                                borderWidth: 1,
                                                borderColor: COLORS.primary,
                                                alignItems: "center",
                                            }}
                                            onPress={() => {
                                                const landlordId = rental.propertyId.landlordId._id;
                                                const landlordName = rental.propertyId.landlordId.name;
                                                const threadId = `${landlordId}_${rental.propertyId._id}`;
                                                router.push(`/messages/${threadId}?name=${encodeURIComponent(landlordName || "Landlord")}&property=${encodeURIComponent(rental.propertyId?.title || "")}`);
                                            }}
                                        >
                                            <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.primary }}>
                                                Message Landlord
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
