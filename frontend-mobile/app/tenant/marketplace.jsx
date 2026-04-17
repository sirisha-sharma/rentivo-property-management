import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { TopBar } from "../../components/TopBar";
import { LocationPickerField } from "../../components/LocationPickerField";
import { SearchBar } from "../../components/SearchBar";
import { FilterChips } from "../../components/FilterChips";
import { EmptyState } from "../../components/EmptyState";
import { COLORS } from "../../constants/theme";
import { getMarketplaceProperties } from "../../api/marketplace";
import { resolveMediaUrl } from "../../utils/media";

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
  const [locationFilter, setLocationFilter] = useState("");
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
      filtered = filtered.filter(
        (property) => property.type?.toLowerCase() === typeFilter.toLowerCase()
      );
    }

    if (locationFilter) {
      filtered = filtered.filter((property) => property.district === locationFilter);
    }

    if (searchQuery) {
      const normalizedQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (property) =>
          property.title?.toLowerCase().includes(normalizedQuery) ||
          property.address?.toLowerCase().includes(normalizedQuery) ||
          property.district?.toLowerCase().includes(normalizedQuery)
      );
    }

    setFilteredProperties(filtered);
  }, [locationFilter, properties, searchQuery, typeFilter]);

  useEffect(() => {
    void fetchProperties();
  }, [fetchProperties]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProperties();
    setRefreshing(false);
  };

  const renderPropertyCard = ({ item }) => (
    <TouchableOpacity
      style={styles.propertyCard}
      onPress={() => router.push(`/tenant/property-detail/${item._id}`)}
      activeOpacity={0.88}
    >
      {item.images && item.images.length > 0 ? (
        <Image
          source={{ uri: resolveMediaUrl(item.images[0]) }}
          style={styles.propertyImage}
          resizeMode="cover"
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
          <Text style={styles.propertyAddress} numberOfLines={1}>
            {item.address}
          </Text>
        </View>

        <View style={styles.propertyMeta}>
          {item.district ? (
            <View style={styles.locationChip}>
              <Ionicons name="navigate-outline" size={12} color={COLORS.accentLilac} />
              <Text style={styles.locationText}>{item.district}</Text>
            </View>
          ) : null}
          <View style={styles.metaChip}>
            <Ionicons name="business-outline" size={12} color={COLORS.primary} />
            <Text style={styles.metaText}>{item.type}</Text>
          </View>
          <View style={styles.metaChip}>
            <Ionicons name="layers-outline" size={12} color={COLORS.primary} />
            <Text style={styles.metaText}>{item.units} units</Text>
          </View>
          {item.rent > 0 ? (
            <View style={styles.rentBadge}>
              <Text style={styles.rentText}>NPR {item.rent.toLocaleString()}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.footerRow}>
          <View style={styles.landlordInfo}>
            <Ionicons name="person-outline" size={14} color={COLORS.mutedForeground} />
            <Text style={styles.landlordText}>{item.landlordId?.name || "Landlord"}</Text>
          </View>
          <View style={styles.ratingWrap}>
            <Ionicons name="star" size={14} color="#FBBF24" />
            <Text style={styles.ratingText}>
              {item.ratingSummary?.count
                ? `${item.ratingSummary.average.toFixed(1)} (${item.ratingSummary.count})`
                : "New"}
            </Text>
          </View>
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

      <View style={{ marginHorizontal: 16, marginTop: 12, marginBottom: 16 }}>
        <LocationPickerField
          label="Location"
          title="Filter by Location"
          placeholder="All locations"
          value={locationFilter}
          onChange={setLocationFilter}
          allowClear
        />
      </View>

      <FilterChips
        options={TYPE_FILTERS}
        selected={typeFilter}
        onSelect={setTypeFilter}
        containerStyle={styles.filterChipsWrapper}
      />

      {filteredProperties.length === 0 ? (
        <EmptyState
          icon="home-outline"
          title="No properties found"
          subtitle="Try a different location or property type"
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
  listContainer: { padding: 16, paddingTop: 8 },
  filterChipsWrapper: { marginTop: 4, marginBottom: 12 },
  propertyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    overflow: "hidden",
  },
  propertyImage: { width: "100%", height: 160, backgroundColor: COLORS.muted },
  placeholderImage: {
    width: "100%",
    height: 160,
    backgroundColor: COLORS.muted,
    justifyContent: "center",
    alignItems: "center",
  },
  propertyInfo: { padding: 16 },
  propertyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.foreground,
    marginBottom: 6,
  },
  propertyDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  propertyAddress: { fontSize: 13, color: COLORS.mutedForeground, flex: 1 },
  propertyMeta: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  locationChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: COLORS.accentLilacSoft,
    borderRadius: 6,
  },
  locationText: {
    fontSize: 12,
    color: COLORS.accentLilac,
    fontWeight: "500",
  },
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
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  landlordInfo: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  landlordText: { fontSize: 13, color: COLORS.mutedForeground },
  ratingWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.foreground,
  },
});
