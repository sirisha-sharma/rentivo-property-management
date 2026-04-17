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
import { getAdminTenancies } from "../../api/admin";

// Screen module for tenancies.

const STATUS_FILTERS = [
  { key: "all", label: "All status" },
  { key: "Active", label: "Active" },
  { key: "Pending", label: "Pending" },
  { key: "Past", label: "Past" },
];

export default function AdminTenanciesScreen() {
  const { user } = useContext(AuthContext);
  const router = useRouter();
  const [tenancies, setTenancies] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const fetchTenancies = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAdminTenancies({
        search,
        status: statusFilter,
      });
      setTenancies(response.tenancies || []);
    } catch (error) {
      console.log("Failed to fetch admin tenancies:", error);
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
      void fetchTenancies();
    }
  }, [fetchTenancies, user?.role]);

  const formatCurrency = (amount) => {
    const numericAmount = Number(amount || 0);
    return `NPR ${numericAmount.toLocaleString()}`;
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.tenant?.name || "Unknown tenant"}</Text>
          <Text style={styles.subtitle}>{item.tenant?.email || "No email available"}</Text>
        </View>
        <StatusBadge status={item.status || "Pending"} />
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="home-outline" size={14} color={COLORS.mutedForeground} />
        <Text style={styles.infoText}>{item.property?.title || "Unknown property"}</Text>
      </View>
      <View style={styles.infoRow}>
        <Ionicons name="person-outline" size={14} color={COLORS.mutedForeground} />
        <Text style={styles.infoText}>
          Landlord: {item.landlord?.name || "Unknown landlord"}
        </Text>
      </View>
      <View style={styles.infoRow}>
        <Ionicons name="calendar-outline" size={14} color={COLORS.mutedForeground} />
        <Text style={styles.infoText}>
          {new Date(item.leaseStart).toLocaleDateString()} - {new Date(item.leaseEnd).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.infoRow}>
        <Ionicons name="wallet-outline" size={14} color={COLORS.mutedForeground} />
        <Text style={styles.infoText}>Security Deposit: {formatCurrency(item.securityDeposit)}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <TopBar title="Admin Tenancies" showBack />

      <View style={styles.searchWrap}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by tenant, property, or landlord"
        />
      </View>

      <FilterChips options={STATUS_FILTERS} selected={statusFilter} onSelect={setStatusFilter} />

      <FlatList
        data={tenancies}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={fetchTenancies}
        ListEmptyComponent={
          <EmptyState
            icon="git-network-outline"
            title="No tenancies found"
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
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.foreground,
    lineHeight: 19,
  },
});
