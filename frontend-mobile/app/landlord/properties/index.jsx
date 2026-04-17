import React, { useContext, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { PropertyContext } from "../../../context/PropertyContext";
import { TenantContext } from "../../../context/TenantContext";
import { SubscriptionContext } from "../../../context/SubscriptionContext";
import { TopBar } from "../../../components/TopBar";
import { StatusBadge } from "../../../components/StatusBadge";
import { SearchBar } from "../../../components/SearchBar";
import { FilterChips } from "../../../components/FilterChips";
import { EmptyState } from "../../../components/EmptyState";
import { SubscriptionGateBanner } from "../../../components/SubscriptionGateBanner";
import { COLORS } from "../../../constants/theme";
import {
    SUBSCRIPTION_ACTIONS,
    getSubscriptionActionAccess,
    getSubscriptionActionPrompt,
} from "../../../utils/subscription";

const FILTERS = [
    { key: "all", label: "All" },
    { key: "occupied", label: "Occupied" },
    { key: "vacant", label: "Vacant" },
];

export default function PropertyList() {
    const { properties, fetchProperties, loading } = useContext(PropertyContext);
    const { tenants, fetchTenants } = useContext(TenantContext);
    const { subscription, fetchSubscription } = useContext(SubscriptionContext);
    const [searchQuery, setSearchQuery] = useState("");
    const [filter, setFilter] = useState("all");
    const router = useRouter();

    useFocusEffect(
        React.useCallback(() => {
            void fetchProperties();
            void fetchTenants();
            void fetchSubscription();
        }, [fetchProperties, fetchSubscription, fetchTenants])
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

    const handleAddPropertyPress = () => {
        if (canAddProperty) {
            router.push("/landlord/properties/add");
            return;
        }

        Alert.alert(actionPrompt.title, actionPrompt.message, [
            { text: "Cancel", style: "cancel" },
            {
                text: actionPrompt.cta,
                onPress: () => router.push("/landlord/subscription"),
            },
        ]);
    };

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
        const tenantCount = tenants.filter(
            (t) => String(t.propertyId?._id || t.propertyId) === String(item._id)
        ).length;

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
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.25,
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

                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 14, flexWrap: "wrap", flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                            <Ionicons name="business-outline" size={14} color={COLORS.mutedForeground} />
                            <Text style={{ fontSize: 13, color: COLORS.mutedForeground }}>{item.units} units</Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                            <Ionicons name="people-outline" size={14} color={COLORS.mutedForeground} />
                            <Text style={{ fontSize: 13, color: COLORS.mutedForeground }}>{tenantCount} tenants</Text>
                        </View>
                    </View>
                    {item.type ? (
                        <View style={{ backgroundColor: COLORS.muted, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7, alignSelf: "flex-start" }}>
                            <Text style={{ fontSize: 12, color: COLORS.mutedForeground, fontWeight: "500" }}>{item.type}</Text>
                        </View>
                    ) : null}
                </View>
            </TouchableOpacity>
        );
    };

    const renderHeader = () => (
        <View style={{ paddingTop: 12, paddingBottom: 8, gap: 8 }}>
            {shouldShowBanner ? (
                <SubscriptionGateBanner
                    title={actionPrompt.title}
                    message={actionPrompt.message}
                    actionLabel={actionPrompt.cta}
                    onActionPress={() => router.push("/landlord/subscription")}
                    tone={canAddProperty ? "info" : "warning"}
                />
            ) : null}
            <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search properties…"
            />
            <FilterChips
                options={FILTERS}
                selected={filter}
                onSelect={setFilter}
                contentContainerStyle={{ paddingHorizontal: 0 }}
            />
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: COLORS.background }}>
            <TopBar title="Properties" showBack />

            {loading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    style={{ flex: 1 }}
                    data={filteredProperties}
                    keyExtractor={(item) => item._id}
                    renderItem={renderItem}
                    ListHeaderComponent={renderHeader}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
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
                onPress={handleAddPropertyPress}
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
