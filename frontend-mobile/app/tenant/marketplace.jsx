import React, { useState, useEffect } from "react";
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity, TextInput, Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { TopBar } from "../../components/TopBar";
import { COLORS } from "../../constants/theme";
import { getMarketplaceProperties } from "../../api/marketplace";
import { BASE_URL } from "../../constants/config";

export default function MarketplaceBrowse() {
  const router = useRouter();
  const [properties, setProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [typeFilter, searchQuery, properties]);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const data = await getMarketplaceProperties();
      setProperties(data.properties || []);
    } catch (error) {
      console.error("Failed to fetch properties:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProperties();
    setRefreshing(false);
  };

  const applyFilters = () => {
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

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={COLORS.mutedForeground} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search properties..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={COLORS.mutedForeground}
        />
      </View>

      <View style={styles.filterContainer}>
        {["all", "Apartment", "House", "Room"].map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.filterChip,
              typeFilter === type && styles.filterChipActive,
            ]}
            onPress={() => setTypeFilter(type)}
          >
            <Text
              style={[
                styles.filterText,
                typeFilter === type && styles.filterTextActive,
              ]}
            >
              {type === "all" ? "All" : type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filteredProperties.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="home-outline" size={64} color={COLORS.mutedForeground} />
          <Text style={styles.emptyText}>No properties found</Text>
          <Text style={styles.emptySubtext}>
            Check back later for new listings
          </Text>
        </View>
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.input,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 14,
    color: COLORS.foreground,
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.muted,
  },
  filterChipActive: { backgroundColor: COLORS.primary },
  filterText: { fontSize: 13, fontWeight: "500", color: COLORS.mutedForeground },
  filterTextActive: { color: "#fff" },
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
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
  },
  emptyText: { fontSize: 18, fontWeight: "600", color: COLORS.foreground, marginTop: 16 },
  emptySubtext: { fontSize: 14, color: COLORS.mutedForeground, marginTop: 8 },
});
