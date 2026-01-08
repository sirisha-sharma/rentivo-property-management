import React, { useContext } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { AuthContext } from "../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";

export default function DashboardScreen() {
  const { user, logout } = useContext(AuthContext);
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace("/");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome,</Text>
            <Text style={styles.userName}>{user?.name}</Text>
          </View>
          <TouchableOpacity style={styles.profileButton}>
            <Ionicons name="person-circle-outline" size={40} color={COLORS.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Role Badge */}
        <View style={styles.roleBadge}>
          <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.primary} />
          <Text style={styles.roleText}>{user?.role?.toUpperCase()}</Text>
        </View>

        {/* Overview Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Overview</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>-</Text>
              <Text style={styles.statLabel}>Properties</Text>
            </View>
            <View style={styles.dividerVertical} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>-</Text>
              <Text style={styles.statLabel}>Tenants</Text>
            </View>
            <View style={styles.dividerVertical} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Open Issues</Text>
            </View>
          </View>
        </View>

        {/* Menu Grid */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        {user?.role === "landlord" && (
          <View style={styles.menuGrid}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push("/landlord/properties")}
            >
              <View style={[styles.iconBox, { backgroundColor: "#DBEAFE" }]}>
                <Ionicons name="home" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.menuText}>Properties</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push("/landlord/tenants")}
            >
              <View style={[styles.iconBox, { backgroundColor: "#DCFCE7" }]}>
                <Ionicons name="people" size={24} color={COLORS.success} />
              </View>
              <Text style={styles.menuText}>Tenants</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { }}
            >
              <View style={[styles.iconBox, { backgroundColor: "#FFEDD5" }]}>
                <Ionicons name="alert-circle" size={24} color={COLORS.warning} />
              </View>
              <Text style={styles.menuText}>Issues</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { }}
            >
              <View style={[styles.iconBox, { backgroundColor: "#F3E8FF" }]}>
                <Ionicons name="document-text" size={24} color="#9333EA" />
              </View>
              <Text style={styles.menuText}>Invoices</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  greeting: {
    fontSize: 16,
    color: COLORS.mutedForeground,
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.foreground,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.muted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 32,
  },
  roleText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    marginBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.foreground,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.foreground,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },
  dividerVertical: {
    width: 1,
    backgroundColor: COLORS.border,
    height: "100%",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.foreground,
    marginBottom: 16,
  },
  menuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 32,
  },
  menuItem: {
    width: "47%",
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    alignItems: "center",
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  menuText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  logoutButton: {
    backgroundColor: "#FEE2E2",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  logoutText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "600",
  },
});
