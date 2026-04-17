import React, { useCallback, useContext, useEffect, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, StyleSheet, Alert, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TopBar } from "../../components/TopBar";
import { SearchBar } from "../../components/SearchBar";
import { FilterChips } from "../../components/FilterChips";
import { EmptyState } from "../../components/EmptyState";
import { StatusBadge } from "../../components/StatusBadge";
import { COLORS } from "../../constants/theme";
import { AuthContext } from "../../context/AuthContext";
import { getAdminProperties, deleteAdminProperty } from "../../api/admin";

const STATUS_FILTERS = [
  { key: "all", label: "All status" },
  { key: "vacant", label: "Vacant" },
  { key: "occupied", label: "Occupied" },
  { key: "maintenance", label: "Maintenance" },
];

export default function AdminPropertiesScreen() {
  const { user } = useContext(AuthContext);
  const router = useRouter();
  const [properties, setProperties] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAdminProperties({
        search,
        status: statusFilter,
      });
      setProperties(response.properties || []);
    } catch (error) {
      console.log("Failed to fetch admin properties:", error);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  const handleDeleteProperty = (propertyId, title) => {
    Alert.alert(
      "Delete Property",
      `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await deleteAdminProperty(propertyId);
              await fetchProperties();
            } catch (error) {
              setLoading(false);
              Alert.alert("Error", error.message || "Failed to delete property");
            }
          }
        }
      ]
    );
  };

  useFocusEffect(
    useCallback(() => {
      if (!user?.token) {
        router.replace("/");
        return undefined;
      }

      if (user.role !== "admin") {
        router.replace("/dashboard");
        return undefined;
      }

      return undefined;
    }, [router, user?.role, user?.token])
  );

  useEffect(() => {
    if (user?.role === "admin") {
      void fetchProperties();
    }
  }, [fetchProperties, user?.role]);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="navigate-outline" size={13} color={COLORS.mutedForeground} />
            <Text style={styles.metaText}>{item.district || "District not set"}</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="person-outline" size={13} color={COLORS.mutedForeground} />
            <Text style={styles.metaText}>{item.landlord?.name || "Unknown landlord"}</Text>
          </View>
        </View>
        <View style={{ alignItems: "flex-end", gap: 10 }}>
          <StatusBadge status={item.status || "vacant"} />
          <TouchableOpacity 
            onPress={() => handleDeleteProperty(item._id, item.title)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={20} color={COLORS.destructive} />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.addressText}>{item.address}</Text>

      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Units</Text>
          <Text style={styles.metricValue}>{item.units || 0}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Rent</Text>
          <Text style={styles.metricValue}>NPR {Math.round(item.rent || 0)}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Active Tenants</Text>
          <Text style={styles.metricValue}>{item.activeTenantCount || 0}</Text>
        </View>
      </View>

      <Text style={styles.footerText}>
        Added {new Date(item.createdAt).toLocaleDateString()}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <TopBar title="Admin Properties" showBack />

      <View style={styles.searchWrap}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by property title or address"
        />
      </View>

      <FilterChips options={STATUS_FILTERS} selected={statusFilter} onSelect={setStatusFilter} />

      <FlatList
        data={properties}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={fetchProperties}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 32 }} />
          ) : (
            <EmptyState
              icon="home-outline"
              title="No properties found"
              subtitle="Try adjusting the search or status filter."
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  listContent: {
    padding: 16,
    paddingTop: 14,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.foreground,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 3,
  },
  metaText: {
    fontSize: 13,
    color: COLORS.mutedForeground,
  },
  addressText: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.foreground,
    marginTop: 14,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
  },
  metricLabel: {
    fontSize: 11,
    color: COLORS.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.foreground,
    marginTop: 6,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    marginTop: 14,
  },
});
