import React, { useCallback, useContext, useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
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
import { getAdminMaintenance } from "../../api/admin";

// Screen module for maintenance.

const STATUS_FILTERS = [
  { key: "all", label: "All status" },
  { key: "Open", label: "Open" },
  { key: "Pending", label: "Pending" },
  { key: "In Progress", label: "In Progress" },
  { key: "Resolved", label: "Resolved" },
];

const PRIORITY_TONES = {
  Low: { bg: COLORS.infoSoft, text: COLORS.info },
  Medium: { bg: COLORS.warningSoft, text: COLORS.warning },
  High: { bg: COLORS.destructiveSoft, text: COLORS.destructive },
};

export default function AdminMaintenanceScreen() {
  const { user } = useContext(AuthContext);
  const router = useRouter();
  const [maintenance, setMaintenance] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const fetchMaintenance = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAdminMaintenance({
        search,
        status: statusFilter,
      });
      setMaintenance(response.maintenance || []);
    } catch (error) {
      console.log("Failed to fetch admin maintenance:", error);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

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
      void fetchMaintenance();
    }
  }, [fetchMaintenance, user?.role]);

  const renderItem = ({ item }) => {
    const priorityTone = PRIORITY_TONES[item.priority] || PRIORITY_TONES.Medium;

    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.propertyTitle}</Text>
          </View>
          <StatusBadge status={item.status || "Open"} />
        </View>

        <View style={styles.priorityPillWrap}>
          <View
            style={[
              styles.priorityPill,
              { backgroundColor: priorityTone.bg, borderColor: `${priorityTone.text}33` },
            ]}
          >
            <Text style={[styles.priorityPillText, { color: priorityTone.text }]}>
              {item.priority} priority
            </Text>
          </View>
        </View>

        <Text style={styles.descriptionText} numberOfLines={3}>
          {item.description || "No additional description provided."}
        </Text>

        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={14} color={COLORS.mutedForeground} />
          <Text style={styles.infoText}>Tenant: {item.tenantName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="shield-outline" size={14} color={COLORS.mutedForeground} />
          <Text style={styles.infoText}>Landlord: {item.landlordName}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TopBar title="Admin Maintenance" showBack />

      <View style={styles.searchWrap}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by issue, property, tenant, or landlord"
        />
      </View>

      <FilterChips options={STATUS_FILTERS} selected={statusFilter} onSelect={setStatusFilter} />

      <FlatList
        data={maintenance}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={fetchMaintenance}
        ListEmptyComponent={
          <EmptyState
            icon="construct-outline"
            title="No maintenance requests found"
            subtitle="Try adjusting the search or status filter."
          />
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
    gap: 12,
    alignItems: "flex-start",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.foreground,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.mutedForeground,
    marginTop: 4,
  },
  priorityPillWrap: {
    marginTop: 14,
    flexDirection: "row",
  },
  priorityPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  priorityPillText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  descriptionText: {
    marginTop: 14,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.foreground,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.mutedForeground,
  },
});
