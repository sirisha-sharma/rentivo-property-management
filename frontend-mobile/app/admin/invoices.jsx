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
import { getAdminInvoices } from "../../api/admin";

const STATUS_FILTERS = [
  { key: "all", label: "All status" },
  { key: "Pending", label: "Pending" },
  { key: "Paid", label: "Paid" },
  { key: "Overdue", label: "Overdue" },
];

export default function AdminInvoicesScreen() {
  const { user } = useContext(AuthContext);
  const router = useRouter();
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAdminInvoices({
        search,
        status: statusFilter,
      });
      setInvoices(response.invoices || []);
    } catch (error) {
      console.log("Failed to fetch admin invoices:", error);
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
      void fetchInvoices();
    }
  }, [fetchInvoices, user?.role]);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.propertyTitle}</Text>
          <Text style={styles.subtitle}>{item.tenantName}</Text>
        </View>
        <StatusBadge status={item.status || "Pending"} />
      </View>

      <View style={styles.amountRow}>
        <Text style={styles.amountText}>NPR {Math.round(item.amount || 0)}</Text>
        <View style={styles.typePill}>
          <Text style={styles.typePillText}>{item.type}</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="person-outline" size={14} color={COLORS.mutedForeground} />
        <Text style={styles.infoText}>Landlord: {item.landlordName}</Text>
      </View>
      <View style={styles.infoRow}>
        <Ionicons name="calendar-outline" size={14} color={COLORS.mutedForeground} />
        <Text style={styles.infoText}>
          Due {new Date(item.dueDate).toLocaleDateString()}
        </Text>
      </View>
      {item.description ? (
        <Text style={styles.descriptionText}>{item.description}</Text>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <TopBar title="Admin Invoices" showBack />

      <View style={styles.searchWrap}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by tenant, property, landlord, or type"
        />
      </View>

      <FilterChips options={STATUS_FILTERS} selected={statusFilter} onSelect={setStatusFilter} />

      <FlatList
        data={invoices}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={fetchInvoices}
        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title="No invoices found"
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
  amountRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  amountText: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.foreground,
  },
  typePill: {
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: "rgba(47,123,255,0.25)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  typePillText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.foreground,
  },
  descriptionText: {
    marginTop: 14,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.mutedForeground,
  },
});
