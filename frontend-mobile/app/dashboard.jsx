import React, { useCallback, useContext, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { AuthContext } from "../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { BarChart, PieChart } from "react-native-gifted-charts";
import { COLORS } from "../constants/theme";
import axios from "axios";
import { API_BASE_URL } from "../constants/config";
import { NotificationContext } from "../context/NotificationContext";
import { MessageContext } from "../context/MessageContext";

// Dashboard Screen Component
// This is the main dashboard screen that displays different content based on user role
// Landlords see property/tenant/invoice stats, Tenants see rental/invitation/invoice stats
export default function DashboardScreen() {
  // Get user data and logout function from AuthContext
  const { user, logout } = useContext(AuthContext);
  const router = useRouter();

  const { unreadCount, fetchNotifications } = useContext(NotificationContext);
  const { unreadMessageCount, fetchUnreadCount } = useContext(MessageContext);
  const screenWidth = Dimensions.get("window").width;

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

  const [landlordCharts, setLandlordCharts] = useState({
    monthlyRentCollection: [],
    paymentStatusBreakdown: {
      Paid: 0,
      Pending: 0,
      Overdue: 0,
    },
    occupancy: {
      occupiedProperties: 0,
      totalProperties: 0,
      occupancyRate: 0,
    },
    maintenanceStats: {
      pending: 0,
      resolved: 0,
    },
  });

  // Loading state for API calls
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!user?.token) {
      return;
    }

    try {
      setLoading(true);
      if (user.role === "landlord") {
        const headers = { Authorization: `Bearer ${user.token}` };
        const [statsResponse, chartResponse] = await Promise.all([
          axios.get(`${API_BASE_URL}/dashboard/stats`, { headers }),
          axios.get(`${API_BASE_URL}/dashboard/landlord-charts`, { headers }),
        ]);
        setStats(statsResponse.data);
        setLandlordCharts(chartResponse.data);
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
  }, [user?.role, user?.token]);

  const monthlyCollectionData = useMemo(
    () =>
      landlordCharts.monthlyRentCollection.map((item) => ({
        value: item.value,
        label: item.label,
        frontColor: COLORS.primary,
        topLabelComponent: () => (
          <Text style={{ fontSize: 10, color: COLORS.mutedForeground }}>
            {item.value > 0 ? `${Math.round(item.value)}` : ""}
          </Text>
        ),
      })),
    [landlordCharts.monthlyRentCollection]
  );

  const paymentPieData = useMemo(
    () => [
      {
        value: landlordCharts.paymentStatusBreakdown.Paid,
        color: COLORS.success,
        text: `${landlordCharts.paymentStatusBreakdown.Paid}`,
        label: "Paid",
      },
      {
        value: landlordCharts.paymentStatusBreakdown.Pending,
        color: COLORS.warning,
        text: `${landlordCharts.paymentStatusBreakdown.Pending}`,
        label: "Pending",
      },
      {
        value: landlordCharts.paymentStatusBreakdown.Overdue,
        color: COLORS.destructive,
        text: `${landlordCharts.paymentStatusBreakdown.Overdue}`,
        label: "Overdue",
      },
    ],
    [landlordCharts.paymentStatusBreakdown]
  );

  const hasCollectionData = monthlyCollectionData.some((item) => item.value > 0);
  const hasPaymentBreakdownData = paymentPieData.some((item) => item.value > 0);

  useFocusEffect(
    useCallback(() => {
      void fetchStats();
      void fetchNotifications();
      void fetchUnreadCount();

      const intervalId = setInterval(() => {
        void fetchStats();
        void fetchNotifications();
        void fetchUnreadCount();
      }, 5000);

      return () => clearInterval(intervalId);
    }, [fetchNotifications, fetchStats, fetchUnreadCount])
  );

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

        {user?.role === "landlord" && (
          <>
            <View className="bg-card rounded-2xl border border-border p-5 mb-4 shadow-sm">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-base font-semibold text-foreground">Rent Collection</Text>
                <Text className="text-xs text-mutedForeground">Last 6 months</Text>
              </View>
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : !hasCollectionData ? (
                <Text className="text-sm text-mutedForeground">
                  No paid invoice data yet for the last 6 months.
                </Text>
              ) : (
                <BarChart
                  data={monthlyCollectionData}
                  width={screenWidth - 120}
                  barWidth={24}
                  spacing={18}
                  roundedTop
                  roundedBottom
                  hideRules
                  xAxisThickness={1}
                  yAxisThickness={0}
                  xAxisColor={COLORS.border}
                  yAxisTextStyle={{ color: COLORS.mutedForeground, fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: COLORS.mutedForeground, fontSize: 11 }}
                  noOfSections={4}
                  maxValue={Math.max(...monthlyCollectionData.map((item) => item.value), 0) || 100}
                />
              )}
            </View>

            <View className="bg-card rounded-2xl border border-border p-5 mb-4 shadow-sm">
              <Text className="text-base font-semibold text-foreground mb-4">Payment Status</Text>
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : !hasPaymentBreakdownData ? (
                <Text className="text-sm text-mutedForeground">
                  No invoice payment status data available yet.
                </Text>
              ) : (
                <>
                  <View style={{ alignItems: "center" }}>
                    <PieChart
                      data={paymentPieData}
                      donut
                      radius={90}
                      innerRadius={55}
                      textColor="#fff"
                      textSize={12}
                      centerLabelComponent={() => (
                        <View style={{ alignItems: "center" }}>
                          <Text style={{ fontSize: 12, color: COLORS.mutedForeground }}>Invoices</Text>
                          <Text style={{ fontSize: 20, fontWeight: "700", color: COLORS.foreground }}>
                            {stats.totalInvoices}
                          </Text>
                        </View>
                      )}
                    />
                  </View>

                  <View className="mt-5 gap-3">
                    {paymentPieData.map((item) => (
                      <View
                        key={item.label}
                        className="flex-row items-center justify-between"
                      >
                        <View className="flex-row items-center gap-2">
                          <View
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: 6,
                              backgroundColor: item.color,
                            }}
                          />
                          <Text className="text-sm text-foreground">{item.label}</Text>
                        </View>
                        <Text className="text-sm font-semibold text-foreground">{item.value}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </View>

            <View className="bg-card rounded-2xl border border-border p-5 mb-8 shadow-sm">
              <Text className="text-base font-semibold text-foreground mb-4">Operations Snapshot</Text>
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <View className="flex-row flex-wrap justify-between gap-y-4">
                  <View className="w-[48%] bg-muted rounded-xl p-4">
                    <Text className="text-xs text-mutedForeground mb-1">Occupancy Rate</Text>
                    <Text className="text-2xl font-bold text-foreground">
                      {landlordCharts.occupancy.occupancyRate}%
                    </Text>
                    <Text className="text-xs text-mutedForeground mt-1">
                      {landlordCharts.occupancy.occupiedProperties} of {landlordCharts.occupancy.totalProperties} properties occupied
                    </Text>
                  </View>
                  <View className="w-[48%] bg-muted rounded-xl p-4">
                    <Text className="text-xs text-mutedForeground mb-1">Maintenance</Text>
                    <Text className="text-2xl font-bold text-foreground">
                      {landlordCharts.maintenanceStats.pending}
                    </Text>
                    <Text className="text-xs text-mutedForeground mt-1">
                      Pending/In Progress requests
                    </Text>
                  </View>
                  <View className="w-[48%] bg-muted rounded-xl p-4">
                    <Text className="text-xs text-mutedForeground mb-1">Resolved Requests</Text>
                    <Text className="text-2xl font-bold text-foreground">
                      {landlordCharts.maintenanceStats.resolved}
                    </Text>
                    <Text className="text-xs text-mutedForeground mt-1">
                      Completed maintenance items
                    </Text>
                  </View>
                  <View className="w-[48%] bg-muted rounded-xl p-4">
                    <Text className="text-xs text-mutedForeground mb-1">Paid Invoices</Text>
                    <Text className="text-2xl font-bold text-foreground">
                      {stats.paidInvoices}
                    </Text>
                    <Text className="text-xs text-mutedForeground mt-1">
                      Total paid invoices so far
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </>
        )}

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

            <TouchableOpacity
              className="w-[47%] bg-card rounded-2xl border border-border p-4 items-center"
              onPress={() => router.push("/messages")}
            >
              <View className="w-12 h-12 rounded-xl items-center justify-center mb-3 bg-pink-100" style={{ position: "relative" }}>
                <Ionicons name="chatbubbles" size={24} color="#DB2777" />
                {unreadMessageCount > 0 && (
                  <View style={{
                    position: "absolute", top: -2, right: -2,
                    backgroundColor: COLORS.destructive, borderRadius: 10,
                    minWidth: 18, height: 18, alignItems: "center", justifyContent: "center",
                    paddingHorizontal: 4,
                  }}>
                    <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
                      {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text className="text-sm font-semibold text-foreground">Messages</Text>
            </TouchableOpacity>
          </View>
        )}

        {user?.role === "tenant" && (
          <View className="flex-row flex-wrap gap-4 mb-8">
            <TouchableOpacity
              className="w-[47%] bg-card rounded-2xl border border-border p-4 items-center"
              onPress={() => router.push("/tenant/marketplace")}
            >
              <View className="w-12 h-12 rounded-xl items-center justify-center mb-3 bg-indigo-100">
                <Ionicons name="search" size={24} color={COLORS.primary} />
              </View>
              <Text className="text-sm font-semibold text-foreground">Browse Properties</Text>
            </TouchableOpacity>

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

            <TouchableOpacity
              className="w-[47%] bg-card rounded-2xl border border-border p-4 items-center"
              onPress={() => router.push("/tenant/payments")}
            >
              <View className="w-12 h-12 rounded-xl items-center justify-center mb-3 bg-purple-100">
                <Ionicons name="receipt" size={24} color="#9333EA" />
              </View>
              <Text className="text-sm font-semibold text-foreground">Payments</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="w-[47%] bg-card rounded-2xl border border-border p-4 items-center"
              onPress={() => router.push("/messages")}
            >
              <View className="w-12 h-12 rounded-xl items-center justify-center mb-3 bg-pink-100" style={{ position: "relative" }}>
                <Ionicons name="chatbubbles" size={24} color="#DB2777" />
                {unreadMessageCount > 0 && (
                  <View style={{
                    position: "absolute", top: -2, right: -2,
                    backgroundColor: COLORS.destructive, borderRadius: 10,
                    minWidth: 18, height: 18, alignItems: "center", justifyContent: "center",
                    paddingHorizontal: 4,
                  }}>
                    <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
                      {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text className="text-sm font-semibold text-foreground">Messages</Text>
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
