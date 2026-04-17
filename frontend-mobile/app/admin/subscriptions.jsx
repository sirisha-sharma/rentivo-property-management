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
import { getAdminSubscriptions } from "../../api/admin";

const STATUS_FILTERS = [
  { key: "all", label: "All status" },
  { key: "trialing", label: "Trialing" },
  { key: "active", label: "Active" },
  { key: "expired", label: "Expired" },
  { key: "pending_payment", label: "Pending Payment" },
];

const PLAN_TINTS = {
  trial: { bg: COLORS.warningSoft, border: "rgba(245,158,11,0.25)", text: COLORS.warning },
  monthly: { bg: COLORS.primarySoft, border: "rgba(47,123,255,0.25)", text: COLORS.primary },
  yearly: { bg: COLORS.successSoft, border: "rgba(16,185,129,0.25)", text: COLORS.success },
};

export default function AdminSubscriptionsScreen() {
  const { user } = useContext(AuthContext);
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const fetchSubscriptions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAdminSubscriptions({
        search,
        status: statusFilter,
      });
      setSubscriptions(response.subscriptions || []);
    } catch (error) {
      console.log("Failed to fetch admin subscriptions:", error);
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
      void fetchSubscriptions();
    }
  }, [fetchSubscriptions, user?.role]);

  const renderItem = ({ item }) => {
    const tone = PLAN_TINTS[item.plan] || PLAN_TINTS.trial;

    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{item.landlord?.name || "Unknown landlord"}</Text>
            <Text style={styles.subtitle}>{item.landlord?.email || "No email available"}</Text>
          </View>
          <StatusBadge status={item.status || "trialing"} />
        </View>

        <View style={styles.planRow}>
          <View style={[styles.planPill, { backgroundColor: tone.bg, borderColor: tone.border }]}>
            <Text style={[styles.planPillText, { color: tone.text }]}>
              {item.plan}
            </Text>
          </View>
          <Text style={styles.gatewayText}>
            {item.gateway ? `Gateway: ${item.gateway}` : "No gateway yet"}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={14} color={COLORS.mutedForeground} />
          <Text style={styles.infoText}>
            Ends {new Date(item.endDate).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="card-outline" size={14} color={COLORS.mutedForeground} />
          <Text style={styles.infoText}>Payment: {item.paymentStatus}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TopBar title="Admin Subscriptions" showBack />

      <View style={styles.searchWrap}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by landlord, email, or plan"
        />
      </View>

      <FilterChips options={STATUS_FILTERS} selected={statusFilter} onSelect={setStatusFilter} />

      <FlatList
        data={subscriptions}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={fetchSubscriptions}
        ListEmptyComponent={
          <EmptyState
            icon="ribbon-outline"
            title="No subscriptions found"
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
  planRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  planPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  planPillText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  gatewayText: {
    fontSize: 12,
    color: COLORS.mutedForeground,
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
});
