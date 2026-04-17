import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
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
import { getAdminUsers, updateAdminUserStatus } from "../../api/admin";

const ROLE_FILTERS = [
  { key: "all", label: "All roles" },
  { key: "landlord", label: "Landlords" },
  { key: "tenant", label: "Tenants" },
  { key: "admin", label: "Admins" },
];

const STATUS_FILTERS = [
  { key: "all", label: "All status" },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
];

const ROLE_TINTS = {
  landlord: { bg: COLORS.primarySoft, border: "rgba(47,123,255,0.25)", text: COLORS.primary },
  tenant: { bg: COLORS.successSoft, border: "rgba(16,185,129,0.25)", text: COLORS.success },
  admin: { bg: COLORS.accentTealSoft, border: "rgba(52,212,198,0.25)", text: COLORS.accentTealBright },
};

export default function AdminUsersScreen() {
  const { user } = useContext(AuthContext);
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAdminUsers({
        search,
        role: roleFilter,
        status: statusFilter,
      });
      setUsers(response.users || []);
    } catch (error) {
      console.log("Failed to fetch admin users:", error);
    } finally {
      setLoading(false);
    }
  }, [roleFilter, search, statusFilter]);

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
      void fetchUsers();
    }
  }, [fetchUsers, user?.role]);

  const handleToggleStatus = (targetUser) => {
    const nextIsActive = !targetUser.isActive;
    const nextLabel = nextIsActive ? "activate" : "deactivate";

    Alert.alert(
      `${nextIsActive ? "Activate" : "Deactivate"} User`,
      `Do you want to ${nextLabel} ${targetUser.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: nextIsActive ? "Activate" : "Deactivate",
          style: nextIsActive ? "default" : "destructive",
          onPress: async () => {
            try {
              setUpdatingId(targetUser._id);
              const response = await updateAdminUserStatus(targetUser._id, nextIsActive);
              setUsers((current) =>
                current.map((item) =>
                  item._id === targetUser._id ? response.user || { ...item, isActive: nextIsActive } : item
                )
              );
            } catch (error) {
              Alert.alert("Action failed", error?.message || "Unable to update this user right now.");
            } finally {
              setUpdatingId(null);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => {
    const roleTint = ROLE_TINTS[item.role] || ROLE_TINTS.tenant;
    const isSelf = item._id === user?._id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <View
                style={[
                  styles.rolePill,
                  { backgroundColor: roleTint.bg, borderColor: roleTint.border },
                ]}
              >
                <Text style={[styles.rolePillText, { color: roleTint.text }]}>
                  {item.role}
                </Text>
              </View>
            </View>
            <Text style={styles.subtitle}>{item.email}</Text>
            <Text style={styles.subtitle}>{item.phone}</Text>
          </View>
        </View>

        <View style={styles.badgesRow}>
          <StatusBadge status={item.isActive ? "active" : "inactive"} />
          <StatusBadge status={item.isEmailVerified ? "verified" : "unverified"} />
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.metaText}>
            Joined {new Date(item.createdAt).toLocaleDateString()}
          </Text>
          <TouchableOpacity
            style={[
              styles.actionButton,
              item.isActive ? styles.deactivateButton : styles.activateButton,
              (isSelf || updatingId === item._id) && styles.actionButtonDisabled,
            ]}
            disabled={isSelf || updatingId === item._id}
            onPress={() => handleToggleStatus(item)}
          >
            {updatingId === item._id ? (
              <ActivityIndicator size="small" color={item.isActive ? COLORS.destructive : COLORS.success} />
            ) : (
              <>
                <Ionicons
                  name={item.isActive ? "pause-circle-outline" : "checkmark-circle-outline"}
                  size={16}
                  color={item.isActive ? COLORS.destructive : COLORS.success}
                />
                <Text
                  style={[
                    styles.actionText,
                    { color: item.isActive ? COLORS.destructive : COLORS.success },
                  ]}
                >
                  {isSelf ? "Current Admin" : item.isActive ? "Deactivate" : "Activate"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TopBar title="Admin Users" showBack />

      <View style={styles.searchWrap}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, email, or phone"
        />
      </View>

      <FilterChips options={ROLE_FILTERS} selected={roleFilter} onSelect={setRoleFilter} />
      <FilterChips options={STATUS_FILTERS} selected={statusFilter} onSelect={setStatusFilter} />

      <FlatList
        data={users}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={fetchUsers}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="No users found"
            subtitle="Try adjusting the role or status filters."
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
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.foreground,
  },
  rolePill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  rolePillText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.mutedForeground,
    marginTop: 2,
  },
  badgesRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    flexWrap: "wrap",
  },
  footerRow: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    flex: 1,
  },
  actionButton: {
    minHeight: 38,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
  },
  activateButton: {
    backgroundColor: COLORS.successSoft,
    borderColor: "rgba(16,185,129,0.25)",
  },
  deactivateButton: {
    backgroundColor: COLORS.destructiveSoft,
    borderColor: "rgba(239,68,68,0.25)",
  },
  actionButtonDisabled: {
    opacity: 0.55,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
