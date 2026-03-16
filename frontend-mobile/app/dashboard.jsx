import React, { useContext, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AuthContext } from "../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";
import axios from "axios";
import { API_BASE_URL } from "../constants/config";
import { NotificationContext } from "../context/NotificationContext";

// Dashboard Screen Component
// This is the main dashboard screen that displays different content based on user role
// Landlords see property/tenant/invoice stats, Tenants see rental/invitation/invoice stats
export default function DashboardScreen() {
  // Get user data and logout function from AuthContext
  const { user, logout } = useContext(AuthContext);
  const router = useRouter();

  const { unreadCount, fetchNotifications } = useContext(NotificationContext);

  // State for landlord statistics
  const [stats, setStats] = useState({
    propertiesCount: 0,
    tenantsCount: 0,
    pendingTenantsCount: 0,
    totalInvoices: 0,
    pendingInvoices: 0,
    paidInvoices: 0,
    overdueInvoices: 0
  });

  // State for tenant statistics
  const [tenantStats, setTenantStats] = useState({
    activeProperties: 0,
    pendingInvitations: 0,
    totalInvoices: 0,
    pendingInvoices: 0,
    paidInvoices: 0
  });

  // Loading state for API calls
  const [loading, setLoading] = useState(true);

  // Fetch dashboard statistics based on user role
  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (user?.role === "landlord") {
          // Fetch landlord stats from API
          const response = await axios.get(`${API_BASE_URL}/dashboard/stats`, {
            headers: { Authorization: `Bearer ${user.token}` },
          });
          setStats(response.data);
        } else {
          // Fetch tenant stats from API
          const response = await axios.get(`${API_BASE_URL}/dashboard/tenant-stats`, {
            headers: { Authorization: `Bearer ${user.token}` },
          });
          setTenantStats(response.data);
        }
      } catch (error) {
        console.log("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    };
    if (user?.token) {
      fetchStats();
      fetchNotifications();
    }
  }, [user]);

  // Handle user logout
  const handleLogout = async () => {
    await logout();
    router.replace("/");
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="p-6">
        {/* Header Section - Shows welcome message and user name */}
        <View className="flex-row justify-between items-center mb-4">
          <View>
            <Text className="text-base text-mutedForeground">Welcome,</Text>
            <Text className="text-2xl font-bold text-foreground">{user?.name}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push("/notifications")}>
            <Ionicons name="notifications-outline" size={28} color={COLORS.foreground} />
            {unreadCount > 0 && (
              <View style={{
                position: "absolute", top: -4, right: -4,
                backgroundColor: COLORS.destructive, borderRadius: 10,
                minWidth: 18, height: 18, alignItems: "center", justifyContent: "center",
                paddingHorizontal: 4,
              }}>
                <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Role Badge - Displays user's role */}
        <View className="flex-row items-center gap-1.5 bg-muted px-3 py-1.5 rounded-full self-start mb-8">
          <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.primary} />
          <Text className="text-sm font-semibold text-foreground">{user?.role?.toUpperCase()}</Text>
        </View>

        {/* Overview Card - Shows key statistics based on user role */}
        <View className="bg-card rounded-2xl border border-border p-5 mb-4 shadow-sm">
          <Text className="text-base font-semibold text-foreground mb-4">Overview</Text>
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <View className="flex-row justify-between">
              {user?.role === "landlord" ? (
                <>
                  {/* Landlord Overview Stats */}
                  <View className="items-center flex-1">
                    <Text className="text-xl font-bold text-foreground">{stats.propertiesCount}</Text>
                    <Text className="text-xs text-mutedForeground">Properties</Text>
                  </View>
                  <View className="w-px bg-border h-full" />
                  <View className="items-center flex-1">
                    <Text className="text-xl font-bold text-foreground">{stats.tenantsCount}</Text>
                    <Text className="text-xs text-mutedForeground">Active Tenants</Text>
                  </View>
                  <View className="w-px bg-border h-full" />
                  <View className="items-center flex-1">
                    <Text className="text-xl font-bold text-foreground">{stats.pendingTenantsCount}</Text>
                    <Text className="text-xs text-mutedForeground">Pending</Text>
                  </View>
                </>
              ) : (
                <>
                  {/* Tenant Overview Stats */}
                  <View className="items-center flex-1">
                    <Text className="text-xl font-bold text-foreground">{tenantStats.activeProperties}</Text>
                    <Text className="text-xs text-mutedForeground">Active Rentals</Text>
                  </View>
                  <View className="w-px bg-border h-full" />
                  <View className="items-center flex-1">
                    <Text className="text-xl font-bold text-foreground">{tenantStats.pendingInvitations}</Text>
                    <Text className="text-xs text-mutedForeground">Pending Invites</Text>
                  </View>
                </>
              )}
            </View>
          )}
        </View>

        {/* Invoice Stats Card - Shows invoice statistics */}
        <View className="bg-card rounded-2xl border border-border p-5 mb-8 shadow-sm">
          <Text className="text-base font-semibold text-foreground mb-4">Invoice Summary</Text>
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <View className="flex-row justify-between">
              {user?.role === "landlord" ? (
                <>
                  {/* Landlord Invoice Stats */}
                  <View className="items-center flex-1">
                    <Text className="text-xl font-bold text-foreground">{stats.totalInvoices}</Text>
                    <Text className="text-xs text-mutedForeground">Total</Text>
                  </View>
                  <View className="w-px bg-border h-full" />
                  <View className="items-center flex-1">
                    <Text className="text-xl font-bold text-warning">{stats.pendingInvoices}</Text>
                    <Text className="text-xs text-mutedForeground">Pending</Text>
                  </View>
                  <View className="w-px bg-border h-full" />
                  <View className="items-center flex-1">
                    <Text className="text-xl font-bold text-success">{stats.paidInvoices}</Text>
                    <Text className="text-xs text-mutedForeground">Paid</Text>
                  </View>
                  <View className="w-px bg-border h-full" />
                  <View className="items-center flex-1">
                    <Text className="text-xl font-bold text-destructive">{stats.overdueInvoices}</Text>
                    <Text className="text-xs text-mutedForeground">Overdue</Text>
                  </View>
                </>
              ) : (
                <>
                  {/* Tenant Invoice Stats */}
                  <View className="items-center flex-1">
                    <Text className="text-xl font-bold text-foreground">{tenantStats.totalInvoices}</Text>
                    <Text className="text-xs text-mutedForeground">Total</Text>
                  </View>
                  <View className="w-px bg-border h-full" />
                  <View className="items-center flex-1">
                    <Text className="text-xl font-bold text-warning">{tenantStats.pendingInvoices}</Text>
                    <Text className="text-xs text-mutedForeground">Pending</Text>
                  </View>
                  <View className="w-px bg-border h-full" />
                  <View className="items-center flex-1">
                    <Text className="text-xl font-bold text-success">{tenantStats.paidInvoices}</Text>
                    <Text className="text-xs text-mutedForeground">Paid</Text>
                  </View>
                </>
              )}
            </View>
          )}
        </View>

        {/* Quick Actions Section - Navigation buttons */}
        <Text className="text-lg font-bold text-foreground mb-4">Quick Actions</Text>

        {user?.role === "landlord" && (
          <View className="flex-row flex-wrap gap-4 mb-8">
            <TouchableOpacity
              className="w-[47%] bg-card rounded-2xl border border-border p-4 items-center"
              onPress={() => router.push("/landlord/properties")}
            >
              <View className="w-12 h-12 rounded-xl items-center justify-center mb-3 bg-blue-100">
                <Ionicons name="home" size={24} color={COLORS.primary} />
              </View>
              <Text className="text-sm font-semibold text-foreground">Properties</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="w-[47%] bg-card rounded-2xl border border-border p-4 items-center"
              onPress={() => router.push("/landlord/tenants")}
            >
              <View className="w-12 h-12 rounded-xl items-center justify-center mb-3 bg-green-100">
                <Ionicons name="people" size={24} color={COLORS.success} />
              </View>
              <Text className="text-sm font-semibold text-foreground">Tenants</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="w-[47%] bg-card rounded-2xl border border-border p-4 items-center"
              onPress={() => router.push("/landlord/maintenance")}
            >
              <View className="w-12 h-12 rounded-xl items-center justify-center mb-3 bg-orange-100">
                <Ionicons name="construct" size={24} color={COLORS.warning} />
              </View>
              <Text className="text-sm font-semibold text-foreground">Maintenance</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="w-[47%] bg-card rounded-2xl border border-border p-4 items-center"
              onPress={() => router.push("/landlord/invoices")}
            >
              <View className="w-12 h-12 rounded-xl items-center justify-center mb-3 bg-purple-100">
                <Ionicons name="document-text" size={24} color="#9333EA" />
              </View>
              <Text className="text-sm font-semibold text-foreground">Invoices</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="w-[47%] bg-card rounded-2xl border border-border p-4 items-center"
              onPress={() => router.push("/landlord/documents")}
            >
              <View className="w-12 h-12 rounded-xl items-center justify-center mb-3 bg-teal-100">
                <Ionicons name="folder-open" size={24} color="#0D9488" />
              </View>
              <Text className="text-sm font-semibold text-foreground">Documents</Text>
            </TouchableOpacity>
          </View>
        )}

        {user?.role === "tenant" && (
          <View className="flex-row flex-wrap gap-4 mb-8">
            <TouchableOpacity
              className="w-[47%] bg-card rounded-2xl border border-border p-4 items-center"
              onPress={() => router.push("/tenant/invitations")}
            >
              <View className="w-12 h-12 rounded-xl items-center justify-center mb-3 bg-blue-100">
                <Ionicons name="mail" size={24} color={COLORS.primary} />
              </View>
              <Text className="text-sm font-semibold text-foreground">Invitations</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="w-[47%] bg-card rounded-2xl border border-border p-4 items-center"
              onPress={() => router.push("/tenant/rentals")}
            >
              <View className="w-12 h-12 rounded-xl items-center justify-center mb-3 bg-green-100">
                <Ionicons name="home" size={24} color={COLORS.success} />
              </View>
              <Text className="text-sm font-semibold text-foreground">My Rentals</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="w-[47%] bg-card rounded-2xl border border-border p-4 items-center"
              onPress={() => router.push("/tenant/invoices")}
            >
              <View className="w-12 h-12 rounded-xl items-center justify-center mb-3 bg-orange-100">
                <Ionicons name="document-text" size={24} color={COLORS.warning} />
              </View>
              <Text className="text-sm font-semibold text-foreground">Invoices</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="w-[47%] bg-card rounded-2xl border border-border p-4 items-center"
              onPress={() => router.push("/tenant/maintenance")}
            >
              <View className="w-12 h-12 rounded-xl items-center justify-center mb-3 bg-red-100">
                <Ionicons name="construct" size={24} color={COLORS.destructive} />
              </View>
              <Text className="text-sm font-semibold text-foreground">Maintenance</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="w-[47%] bg-card rounded-2xl border border-border p-4 items-center"
              onPress={() => router.push("/tenant/documents")}
            >
              <View className="w-12 h-12 rounded-xl items-center justify-center mb-3 bg-teal-100">
                <Ionicons name="folder-open" size={24} color="#0D9488" />
              </View>
              <Text className="text-sm font-semibold text-foreground">Documents</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity className="bg-red-100 p-4 rounded-xl items-center" onPress={handleLogout}>
          <Text className="text-red-500 text-base font-semibold">Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
