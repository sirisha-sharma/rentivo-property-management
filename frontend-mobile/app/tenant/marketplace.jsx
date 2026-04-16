import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { TopBar } from "../../components/TopBar";
import { SearchBar } from "../../components/SearchBar";
import { FilterChips } from "../../components/FilterChips";
import { EmptyState } from "../../components/EmptyState";
import { COLORS } from "../../constants/theme";
import { getMarketplaceProperties } from "../../api/marketplace";
import { BASE_URL } from "../../constants/config";

const TYPE_FILTERS = [
  { key: "all", label: "All" },
  { key: "Apartment", label: "Apartment" },
  { key: "House", label: "House" },
  { key: "Room", label: "Room" },
];

export default function MarketplaceBrowse() {
  const router = useRouter();
  const [properties, setProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMarketplaceProperties();
      setProperties(data.properties || []);
    } catch (error) {
      console.error("Failed to fetch properties:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const applyFilters = useCallback(() => {
    let filtered = properties;

    if (typeFilter !== "all") {
      filtered = filtered.filter(p =>
        p.type?.toLowerCase() === typeFilter.toLowerCase()
      );
    }

    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.address?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredProperties(filtered);
  }, [properties, searchQuery, typeFilter]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProperties();
    setRefreshing(false);
  };

  // Helper function to construct proper image URI
  const getImageUri = (img) => {
    if (!img) return "";
    // If it's already a full URL, return as-is
    if (img.startsWith('http://') || img.startsWith('https://')) {
      return img;
    }
    // Otherwise, it's a server path - prepend BASE_URL (not API_BASE_URL)
    return `${BASE_URL}${img}`;
  };

  const renderPropertyCard = ({ item }) => (
    <TouchableOpacity
      style={styles.propertyCard}
      onPress={() => router.push(`/tenant/property-detail/${item._id}`)}
    >
      {item.images && item.images.length > 0 ? (
        <Image
          source={{ uri: getImageUri(item.images[0]) }}
          style={styles.propertyImage}
        />
      ) : (
        <View style={styles.placeholderImage}>
          <Ionicons name="home-outline" size={48} color={COLORS.mutedForeground} />
        </View>
      )}

      <View style={styles.propertyInfo}>
        <Text style={styles.propertyTitle}>{item.title}</Text>
        <View style={styles.propertyDetail}>
          <Ionicons name="location-outline" size={14} color={COLORS.mutedForeground} />
          <Text style={styles.propertyAddress} numberOfLines={1}>{item.address}</Text>
        </View>

        <View style={styles.propertyMeta}>
          <View style={styles.metaChip}>
            <Ionicons name="business-outline" size={12} color={COLORS.primary} />
            <Text style={styles.metaText}>{item.type}</Text>
          </View>
          <View style={styles.metaChip}>
            <Ionicons name="layers-outline" size={12} color={COLORS.primary} />
            <Text style={styles.metaText}>{item.units} units</Text>
          </View>
          {item.rent > 0 && (
            <View style={styles.rentBadge}>
              <Text style={styles.rentText}>NPR {item.rent.toLocaleString()}</Text>
            </View>
          )}
        </View>

        <View style={styles.landlordInfo}>
          <Ionicons name="person-outline" size={14} color={COLORS.mutedForeground} />
          <Text style={styles.landlordText}>{item.landlordId?.name || "Landlord"}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <TopBar title="Browse Properties" showBack />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TopBar title="Browse Properties" showBack />

      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search properties..."
        style={{ marginHorizontal: 16, marginTop: 12 }}
      />

      <FilterChips options={TYPE_FILTERS} selected={typeFilter} onSelect={setTypeFilter} />

      {filteredProperties.length === 0 ? (
        <EmptyState
          icon="home-outline"
          title="No properties found"
          subtitle="Check back later for new listings"
        />
      ) : (
        <FlatList
          data={filteredProperties}
          renderItem={renderPropertyCard}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContainer: { padding: 16 },
  propertyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    overflow: "hidden",
  },
  propertyImage: { width: "100%", height: 180, backgroundColor: COLORS.muted },
  placeholderImage: {
    width: "100%",
    height: 180,
    backgroundColor: COLORS.muted,
    justifyContent: "center",
    alignItems: "center",
  },
  propertyInfo: { padding: 16 },
  propertyTitle: { fontSize: 18, fontWeight: "600", color: COLORS.foreground, marginBottom: 6 },
  propertyDetail: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  propertyAddress: { fontSize: 13, color: COLORS.mutedForeground, flex: 1 },
  propertyMeta: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: 6,
  },
  metaText: { fontSize: 12, color: COLORS.primary, fontWeight: "500" },
  rentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: COLORS.success + "15",
    borderRadius: 6,
  },
  rentText: { fontSize: 12, fontWeight: "600", color: COLORS.success },
  landlordInfo: { flexDirection: "row", alignItems: "center", gap: 6 },
  landlordText: { fontSize: 13, color: COLORS.mutedForeground },
});
