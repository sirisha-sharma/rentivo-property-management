import React, { useCallback, useContext, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { AuthContext } from "../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BarChart, PieChart } from "react-native-gifted-charts";
import { COLORS } from "../constants/theme";
import axios from "axios";
import { API_BASE_URL } from "../constants/config";
import { NotificationContext } from "../context/NotificationContext";
import { MessageContext } from "../context/MessageContext";
import { SubscriptionContext } from "../context/SubscriptionContext";
import { SubscriptionSummaryCard } from "../components/SubscriptionSummaryCard";

// ─── Helpers ───────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

// ─── Sub-components ────────────────────────────────────────────────────────

function StatTile({ icon, iconBg, iconColor, value, label, loading }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#fff",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 16,
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          backgroundColor: iconBg,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
        }}
      >
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={COLORS.primary} />
      ) : (
        <>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "700",
              color: COLORS.foreground,
              letterSpacing: -0.5,
              lineHeight: 28,
            }}
          >
            {value}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: COLORS.mutedForeground,
              marginTop: 3,
              fontWeight: "500",
            }}
          >
            {label}
          </Text>
        </>
      )}
    </View>
  );
}

function SectionCard({ title, subtitle, children, style }) {
  return (
    <View
      style={[
        {
          backgroundColor: "#fff",
          borderRadius: 20,
          borderWidth: 1,
          borderColor: COLORS.border,
          padding: 20,
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.04,
          shadowRadius: 10,
          elevation: 2,
        },
        style,
      ]}
    >
      {(title || subtitle) && (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          {title ? (
            <Text
              style={{
                fontSize: 15,
                fontWeight: "700",
                color: COLORS.foreground,
                letterSpacing: -0.1,
              }}
            >
              {title}
            </Text>
          ) : null}
          {subtitle ? (
            <Text style={{ fontSize: 12, color: COLORS.mutedForeground }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      )}
      {children}
    </View>
  );
}

function EmptyChartState({ message }) {
  return (
    <View
      style={{
        alignItems: "center",
        paddingVertical: 24,
        gap: 8,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: COLORS.muted,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="bar-chart-outline" size={22} color={COLORS.mutedForeground} />
      </View>
      <Text
        style={{
          fontSize: 13,
          color: COLORS.mutedForeground,
          textAlign: "center",
          lineHeight: 18,
        }}
      >
        {message}
      </Text>
    </View>
  );
}

function BadgeCount({ count }) {
  if (!count) return null;
  return (
    <View
      style={{
        position: "absolute",
        top: -5,
        right: -5,
        backgroundColor: COLORS.destructive,
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 4,
        borderWidth: 1.5,
        borderColor: "#fff",
      }}
    >
      <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
        {count > 9 ? "9+" : count}
      </Text>
    </View>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const { user, logout } = useContext(AuthContext);
  const router = useRouter();

  const { unreadCount, fetchNotifications } = useContext(NotificationContext);
  const { unreadMessageCount, fetchUnreadCount } = useContext(MessageContext);
  const { subscription, loading: subscriptionLoading, fetchSubscription } =
    useContext(SubscriptionContext);
  const { width: screenWidth } = useWindowDimensions();
  // chart width = screen - horizontal page padding - card padding
  const chartWidth = screenWidth - 40 - 40 - 8;

  // ── State ──
  const [stats, setStats] = useState({
    propertiesCount: 0,
    tenantsCount: 0,
    pendingTenantsCount: 0,
    totalInvoices: 0,
    pendingInvoices: 0,
    paidInvoices: 0,
    overdueInvoices: 0,
  });

  const [tenantStats, setTenantStats] = useState({
    activeProperties: 0,
    pendingInvitations: 0,
    totalInvoices: 0,
    pendingInvoices: 0,
    paidInvoices: 0,
    overdueInvoices: 0,
  });

  const [landlordCharts, setLandlordCharts] = useState({
    monthlyRentCollection: [],
    paymentStatusBreakdown: { Paid: 0, Pending: 0, Overdue: 0 },
    occupancy: { occupiedProperties: 0, totalProperties: 0, occupancyRate: 0 },
    maintenanceStats: { pending: 0, resolved: 0 },
  });

  const [tenantCharts, setTenantCharts] = useState({
    monthlyRentPaid: [],
    paymentStatusBreakdown: { Paid: 0, Pending: 0, Overdue: 0 },
    maintenanceStats: { pending: 0, inProgress: 0, resolved: 0 },
  });

  const [loading, setLoading] = useState(true);

  // ── Data fetching ──
  const fetchStats = useCallback(async () => {
    if (!user?.token) return;
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
        const headers = { Authorization: `Bearer ${user.token}` };
        const [statsResponse, chartResponse] = await Promise.all([
          axios.get(`${API_BASE_URL}/dashboard/tenant-stats`, { headers }),
          axios.get(`${API_BASE_URL}/dashboard/tenant-charts`, { headers }),
        ]);
        setTenantStats(statsResponse.data);
        setTenantCharts(chartResponse.data);
      }
    } catch (error) {
      console.log("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.role, user?.token]);

  // ── Chart data memos ──
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
        label: "Paid",
      },
      {
        value: landlordCharts.paymentStatusBreakdown.Pending,
        color: COLORS.warning,
        label: "Pending",
      },
      {
        value: landlordCharts.paymentStatusBreakdown.Overdue,
        color: COLORS.destructive,
        label: "Overdue",
      },
    ],
    [landlordCharts.paymentStatusBreakdown]
  );

  const tenantMonthlyPaidData = useMemo(
    () =>
      tenantCharts.monthlyRentPaid.map((item) => ({
        value: item.value,
        label: item.label,
        frontColor: COLORS.success,
        topLabelComponent: () => (
          <Text style={{ fontSize: 10, color: COLORS.mutedForeground }}>
            {item.value > 0 ? `${Math.round(item.value)}` : ""}
          </Text>
        ),
      })),
    [tenantCharts.monthlyRentPaid]
  );

  const tenantPaymentPieData = useMemo(
    () => [
      {
        value: tenantCharts.paymentStatusBreakdown.Paid,
        color: COLORS.success,
        label: "Paid",
      },
      {
        value: tenantCharts.paymentStatusBreakdown.Pending,
        color: COLORS.warning,
        label: "Pending",
      },
      {
        value: tenantCharts.paymentStatusBreakdown.Overdue,
        color: COLORS.destructive,
        label: "Overdue",
      },
    ],
    [tenantCharts.paymentStatusBreakdown]
  );

  const hasCollectionData = monthlyCollectionData.some((d) => d.value > 0);
  const hasPaymentBreakdownData = paymentPieData.some((d) => d.value > 0);
  const hasTenantCollectionData = tenantMonthlyPaidData.some((d) => d.value > 0);
  const hasTenantPaymentBreakdownData = tenantPaymentPieData.some((d) => d.value > 0);

  useFocusEffect(
    useCallback(() => {
      void fetchStats();
      void fetchNotifications();
      void fetchUnreadCount();
      if (user?.role === "landlord") {
        void fetchSubscription();
      }

      return undefined;
    }, [fetchNotifications, fetchStats, fetchSubscription, fetchUnreadCount, user?.role])
  );

  const handleLogout = async () => {
    await logout();
    router.replace("/");
  };

  const isLandlord = user?.role === "landlord";

  // ── Quick action definitions ──
  const landlordActions = [
    {
      label: "Properties",
      icon: "home",
      bg: "#EFF6FF",
      color: COLORS.primary,
      route: "/landlord/properties",
    },
    {
      label: "Tenants",
      icon: "people",
      bg: "#ECFDF5",
      color: COLORS.success,
      route: "/landlord/tenants",
    },
    {
      label: "Maintenance",
      icon: "construct",
      bg: "#FFFBEB",
      color: COLORS.warning,
      route: "/landlord/maintenance",
    },
    {
      label: "Invoices",
      icon: "document-text",
      bg: "#F5F3FF",
      color: "#7C3AED",
      route: "/landlord/invoices",
    },
    {
      label: "Documents",
      icon: "folder-open",
      bg: "#F0FDFA",
      color: "#0D9488",
      route: "/landlord/documents",
    },
    {
      label: "Messages",
      icon: "chatbubbles",
      bg: "#FDF2F8",
      color: "#DB2777",
      route: "/messages",
      badge: unreadMessageCount,
    },
    {
      label: "Subscription",
      icon: "sparkles",
      bg: "#F0FDFA",
      color: "#0F766E",
      route: "/landlord/subscription",
    },
  ];

  const tenantActions = [
    {
      label: "Browse",
      icon: "search",
      bg: "#EFF6FF",
      color: COLORS.primary,
      route: "/tenant/marketplace",
    },
    {
      label: "Invitations",
      icon: "mail",
      bg: "#EFF6FF",
      color: "#3B82F6",
      route: "/tenant/invitations",
    },
    {
      label: "My Rentals",
      icon: "home",
      bg: "#ECFDF5",
      color: COLORS.success,
      route: "/tenant/rentals",
    },
    {
      label: "Invoices",
      icon: "document-text",
      bg: "#FFF7ED",
      color: "#EA580C",
      route: "/tenant/invoices",
    },
    {
      label: "Maintenance",
      icon: "construct",
      bg: "#FEF2F2",
      color: COLORS.destructive,
      route: "/tenant/maintenance",
    },
    {
      label: "Documents",
      icon: "folder-open",
      bg: "#F0FDFA",
      color: "#0D9488",
      route: "/tenant/documents",
    },
    {
      label: "Payments",
      icon: "receipt",
      bg: "#F5F3FF",
      color: "#7C3AED",
      route: "/tenant/payments",
    },
    {
      label: "Messages",
      icon: "chatbubbles",
      bg: "#FDF2F8",
      color: "#DB2777",
      route: "/messages",
      badge: unreadMessageCount,
    },
  ];

  const actions = isLandlord ? landlordActions : tenantActions;
  const subscriptionButtonLabel =
    subscription?.plan === "trial"
      ? "Upgrade Plan"
      : subscription?.status !== "active" || subscription?.isExpiringSoon
        ? "Renew Plan"
      : "Manage Plan";

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#EFF6FF" />

      <ScrollView
        contentContainerStyle={{
          paddingBottom: 48,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <LinearGradient
          colors={["#EFF6FF", "#F8FAFC"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            {/* Left: avatar + greeting */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
              <LinearGradient
                colors={["#3B82F6", "#1D4ED8"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: "#2563EB",
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.25,
                  shadowRadius: 6,
                  elevation: 4,
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 16,
                    fontWeight: "700",
                    letterSpacing: 0.5,
                  }}
                >
                  {getInitials(user?.name)}
                </Text>
              </LinearGradient>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 13,
                    color: COLORS.mutedForeground,
                    fontWeight: "500",
                  }}
                >
                  {getGreeting()}
                </Text>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: COLORS.foreground,
                    letterSpacing: -0.3,
                  }}
                  numberOfLines={1}
                >
                  {user?.name}
                </Text>
              </View>
            </View>

            {/* Right: notification bell */}
            <TouchableOpacity
              onPress={() => router.push("/notifications")}
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                backgroundColor: "#fff",
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#0F172A",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.06,
                shadowRadius: 4,
                elevation: 2,
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="notifications-outline" size={22} color={COLORS.foreground} />
              <BadgeCount count={unreadCount} />
            </TouchableOpacity>
          </View>

          {/* Role badge */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              alignSelf: "flex-start",
              marginTop: 14,
              backgroundColor: isLandlord ? "#DBEAFE" : "#D1FAE5",
              borderRadius: 20,
              paddingHorizontal: 10,
              paddingVertical: 5,
              gap: 5,
            }}
          >
            <Ionicons
              name={isLandlord ? "home-outline" : "person-outline"}
              size={13}
              color={isLandlord ? COLORS.primary : COLORS.success}
            />
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: isLandlord ? "#1D4ED8" : "#065F46",
                letterSpacing: 0.5,
                textTransform: "uppercase",
              }}
            >
              {user?.role}
            </Text>
          </View>
        </LinearGradient>

        {/* ── Content ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 24, gap: 16 }}>
          {isLandlord ? (
            <SubscriptionSummaryCard
              subscription={subscription}
              loading={subscriptionLoading}
              buttonLabel={subscriptionButtonLabel}
              onPress={() => router.push("/landlord/subscription")}
            />
          ) : null}

          {/* ── Stats Grid ── */}
          {isLandlord ? (
            <>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <StatTile
                  icon="home"
                  iconBg="#EFF6FF"
                  iconColor={COLORS.primary}
                  value={stats.propertiesCount}
                  label="Properties"
                  loading={loading}
                />
                <StatTile
                  icon="people"
                  iconBg="#ECFDF5"
                  iconColor={COLORS.success}
                  value={stats.tenantsCount}
                  label="Active Tenants"
                  loading={loading}
                />
              </View>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <StatTile
                  icon="time-outline"
                  iconBg="#FFFBEB"
                  iconColor={COLORS.warning}
                  value={stats.pendingTenantsCount}
                  label="Pending Tenants"
                  loading={loading}
                />
                <StatTile
                  icon="alert-circle-outline"
                  iconBg="#FEF2F2"
                  iconColor={COLORS.destructive}
                  value={stats.overdueInvoices}
                  label="Overdue Invoices"
                  loading={loading}
                />
              </View>
            </>
          ) : (
            <>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <StatTile
                  icon="home"
                  iconBg="#EFF6FF"
                  iconColor={COLORS.primary}
                  value={tenantStats.activeProperties}
                  label="Active Rentals"
                  loading={loading}
                />
                <StatTile
                  icon="mail-outline"
                  iconBg="#FFFBEB"
                  iconColor={COLORS.warning}
                  value={tenantStats.pendingInvitations}
                  label="Pending Invites"
                  loading={loading}
                />
              </View>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <StatTile
                  icon="document-text-outline"
                  iconBg="#FFF7ED"
                  iconColor="#EA580C"
                  value={tenantStats.pendingInvoices}
                  label="Pending Invoices"
                  loading={loading}
                />
                <StatTile
                  icon="alert-circle-outline"
                  iconBg="#FEF2F2"
                  iconColor={COLORS.destructive}
                  value={tenantStats.overdueInvoices}
                  label="Overdue Invoices"
                  loading={loading}
                />
              </View>
            </>
          )}

          {/* ── Invoice Summary Row ── */}
          <SectionCard title={isLandlord ? "Invoice Summary" : "My Invoices"}>
            {loading ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <View style={{ flexDirection: "row", gap: 0 }}>
                {[
                  {
                    label: "Total",
                    value: isLandlord ? stats.totalInvoices : tenantStats.totalInvoices,
                    color: COLORS.foreground,
                  },
                  {
                    label: "Pending",
                    value: isLandlord ? stats.pendingInvoices : tenantStats.pendingInvoices,
                    color: COLORS.warning,
                  },
                  {
                    label: "Paid",
                    value: isLandlord ? stats.paidInvoices : tenantStats.paidInvoices,
                    color: COLORS.success,
                  },
                  {
                    label: "Overdue",
                    value: isLandlord ? stats.overdueInvoices : tenantStats.overdueInvoices,
                    color: COLORS.destructive,
                  },
                ].map((item, idx, arr) => (
                  <View
                    key={item.label}
                    style={{
                      flex: 1,
                      alignItems: "center",
                      borderRightWidth: idx < arr.length - 1 ? 1 : 0,
                      borderRightColor: COLORS.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 22,
                        fontWeight: "700",
                        color: item.color,
                        letterSpacing: -0.5,
                      }}
                    >
                      {item.value}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        color: COLORS.mutedForeground,
                        marginTop: 2,
                        fontWeight: "500",
                      }}
                    >
                      {item.label}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </SectionCard>

          {/* ── Landlord Charts ── */}
          {isLandlord && (
            <>
              <SectionCard title="Rent Collection" subtitle="Last 6 months">
                {loading ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : !hasCollectionData ? (
                  <EmptyChartState message="No payment data yet for the last 6 months." />
                ) : (
                  <BarChart
                    data={monthlyCollectionData}
                    width={chartWidth}
                    barWidth={26}
                    spacing={16}
                    roundedTop
                    roundedBottom
                    hideRules
                    xAxisThickness={1}
                    yAxisThickness={0}
                    xAxisColor={COLORS.border}
                    yAxisTextStyle={{ color: COLORS.mutedForeground, fontSize: 10 }}
                    xAxisLabelTextStyle={{ color: COLORS.mutedForeground, fontSize: 11 }}
                    noOfSections={4}
                    maxValue={
                      Math.max(...monthlyCollectionData.map((d) => d.value), 0) || 100
                    }
                  />
                )}
              </SectionCard>

              <SectionCard title="Payment Status">
                {loading ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : !hasPaymentBreakdownData ? (
                  <EmptyChartState message="No invoice payment data available yet." />
                ) : (
                  <>
                    <View style={{ alignItems: "center", marginBottom: 4 }}>
                      <PieChart
                        data={paymentPieData}
                        donut
                        radius={88}
                        innerRadius={54}
                        textColor="#fff"
                        textSize={12}
                        centerLabelComponent={() => (
                          <View style={{ alignItems: "center" }}>
                            <Text style={{ fontSize: 11, color: COLORS.mutedForeground }}>
                              Invoices
                            </Text>
                            <Text
                              style={{
                                fontSize: 20,
                                fontWeight: "700",
                                color: COLORS.foreground,
                              }}
                            >
                              {stats.totalInvoices}
                            </Text>
                          </View>
                        )}
                      />
                    </View>
                    <View style={{ gap: 10, marginTop: 8 }}>
                      {paymentPieData.map((item) => (
                        <View
                          key={item.label}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <View
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: 5,
                                backgroundColor: item.color,
                              }}
                            />
                            <Text style={{ fontSize: 14, color: COLORS.foreground }}>
                              {item.label}
                            </Text>
                          </View>
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "600",
                              color: COLORS.foreground,
                            }}
                          >
                            {item.value}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}
              </SectionCard>

              <SectionCard title="Operations Snapshot">
                {loading ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      justifyContent: "space-between",
                      marginBottom: -12,
                    }}
                  >
                    {[
                      {
                        label: "Occupancy Rate",
                        value: `${landlordCharts.occupancy.occupancyRate}%`,
                        sub: `${landlordCharts.occupancy.occupiedProperties}/${landlordCharts.occupancy.totalProperties} occupied`,
                        iconBg: "#EFF6FF",
                        icon: "business-outline",
                        iconColor: COLORS.primary,
                      },
                      {
                        label: "Open Maintenance",
                        value: landlordCharts.maintenanceStats.pending,
                        sub: "Pending or in progress",
                        iconBg: "#FFFBEB",
                        icon: "construct-outline",
                        iconColor: COLORS.warning,
                      },
                      {
                        label: "Resolved",
                        value: landlordCharts.maintenanceStats.resolved,
                        sub: "Completed requests",
                        iconBg: "#ECFDF5",
                        icon: "checkmark-circle-outline",
                        iconColor: COLORS.success,
                      },
                      {
                        label: "Paid Invoices",
                        value: stats.paidInvoices,
                        sub: "Total paid so far",
                        iconBg: "#F5F3FF",
                        icon: "receipt-outline",
                        iconColor: "#7C3AED",
                      },
                    ].map((item) => (
                      <View
                        key={item.label}
                        style={{
                          width: "48%",
                          backgroundColor: COLORS.muted,
                          borderRadius: 14,
                          padding: 14,
                          minWidth: 0,
                          marginBottom: 12,
                        }}
                      >
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            backgroundColor: item.iconBg,
                            alignItems: "center",
                            justifyContent: "center",
                            marginBottom: 10,
                          }}
                        >
                          <Ionicons name={item.icon} size={16} color={item.iconColor} />
                        </View>
                        <Text
                          style={{
                            fontSize: 11,
                            color: COLORS.mutedForeground,
                            fontWeight: "500",
                            marginBottom: 4,
                          }}
                        >
                          {item.label}
                        </Text>
                        <Text
                          style={{
                            fontSize: 22,
                            fontWeight: "700",
                            color: COLORS.foreground,
                            letterSpacing: -0.5,
                          }}
                        >
                          {item.value}
                        </Text>
                        <Text
                          style={{
                            fontSize: 11,
                            color: COLORS.mutedForeground,
                            marginTop: 2,
                          }}
                        >
                          {item.sub}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </SectionCard>
            </>
          )}

          {/* ── Tenant Charts ── */}
          {!isLandlord && (
            <>
              <SectionCard title="Rent Paid" subtitle="Last 6 months">
                {loading ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : !hasTenantCollectionData ? (
                  <EmptyChartState message="No payment data yet for the last 6 months." />
                ) : (
                  <BarChart
                    data={tenantMonthlyPaidData}
                    width={chartWidth}
                    barWidth={26}
                    spacing={16}
                    roundedTop
                    roundedBottom
                    hideRules
                    xAxisThickness={1}
                    yAxisThickness={0}
                    xAxisColor={COLORS.border}
                    yAxisTextStyle={{ color: COLORS.mutedForeground, fontSize: 10 }}
                    xAxisLabelTextStyle={{ color: COLORS.mutedForeground, fontSize: 11 }}
                    noOfSections={4}
                    maxValue={
                      Math.max(...tenantMonthlyPaidData.map((d) => d.value), 0) || 100
                    }
                  />
                )}
              </SectionCard>

              <SectionCard title="Payment Status">
                {loading ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : !hasTenantPaymentBreakdownData ? (
                  <EmptyChartState message="No invoice payment data available yet." />
                ) : (
                  <>
                    <View style={{ alignItems: "center", marginBottom: 4 }}>
                      <PieChart
                        data={tenantPaymentPieData}
                        donut
                        radius={88}
                        innerRadius={54}
                        textColor="#fff"
                        textSize={12}
                        centerLabelComponent={() => (
                          <View style={{ alignItems: "center" }}>
                            <Text style={{ fontSize: 11, color: COLORS.mutedForeground }}>
                              Invoices
                            </Text>
                            <Text
                              style={{
                                fontSize: 20,
                                fontWeight: "700",
                                color: COLORS.foreground,
                              }}
                            >
                              {tenantStats.totalInvoices}
                            </Text>
                          </View>
                        )}
                      />
                    </View>
                    <View style={{ gap: 10, marginTop: 8 }}>
                      {tenantPaymentPieData.map((item) => (
                        <View
                          key={item.label}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <View
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: 5,
                                backgroundColor: item.color,
                              }}
                            />
                            <Text style={{ fontSize: 14, color: COLORS.foreground }}>
                              {item.label}
                            </Text>
                          </View>
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "600",
                              color: COLORS.foreground,
                            }}
                          >
                            {item.value}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}
              </SectionCard>

              <SectionCard title="Tenant Snapshot">
                {loading ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      justifyContent: "space-between",
                      marginBottom: -12,
                    }}
                  >
                    {[
                      {
                        label: "Active Rentals",
                        value: tenantStats.activeProperties,
                        sub: "Current properties",
                        iconBg: "#EFF6FF",
                        icon: "home-outline",
                        iconColor: COLORS.primary,
                      },
                      {
                        label: "Pending Invites",
                        value: tenantStats.pendingInvitations,
                        sub: "Waiting for action",
                        iconBg: "#FFFBEB",
                        icon: "mail-outline",
                        iconColor: COLORS.warning,
                      },
                      {
                        label: "Open Requests",
                        value:
                          tenantCharts.maintenanceStats.pending +
                          tenantCharts.maintenanceStats.inProgress,
                        sub: "Active maintenance",
                        iconBg: "#FEF2F2",
                        icon: "construct-outline",
                        iconColor: COLORS.destructive,
                      },
                      {
                        label: "Resolved",
                        value: tenantCharts.maintenanceStats.resolved,
                        sub: "Completed issues",
                        iconBg: "#ECFDF5",
                        icon: "checkmark-circle-outline",
                        iconColor: COLORS.success,
                      },
                    ].map((item) => (
                      <View
                        key={item.label}
                        style={{
                          width: "48%",
                          backgroundColor: COLORS.muted,
                          borderRadius: 14,
                          padding: 14,
                          minWidth: 0,
                          marginBottom: 12,
                        }}
                      >
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            backgroundColor: item.iconBg,
                            alignItems: "center",
                            justifyContent: "center",
                            marginBottom: 10,
                          }}
                        >
                          <Ionicons name={item.icon} size={16} color={item.iconColor} />
                        </View>
                        <Text
                          style={{
                            fontSize: 11,
                            color: COLORS.mutedForeground,
                            fontWeight: "500",
                            marginBottom: 4,
                          }}
                        >
                          {item.label}
                        </Text>
                        <Text
                          style={{
                            fontSize: 22,
                            fontWeight: "700",
                            color: COLORS.foreground,
                            letterSpacing: -0.5,
                          }}
                        >
                          {item.value}
                        </Text>
                        <Text
                          style={{
                            fontSize: 11,
                            color: COLORS.mutedForeground,
                            marginTop: 2,
                          }}
                        >
                          {item.sub}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </SectionCard>
            </>
          )}

          {/* ── Quick Actions ── */}
          <View style={{ marginTop: 4 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: COLORS.foreground,
                marginBottom: 14,
                letterSpacing: -0.2,
              }}
            >
              Quick Actions
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "space-between",
                marginBottom: -12,
              }}
            >
              {actions.map((action) => (
                <TouchableOpacity
                  key={action.label}
                  onPress={() => router.push(action.route)}
                  activeOpacity={0.8}
                  style={{
                    width: "48%",
                    backgroundColor: "#fff",
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    padding: 16,
                    alignItems: "center",
                    shadowColor: "#0F172A",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.04,
                    shadowRadius: 8,
                    elevation: 2,
                    marginBottom: 12,
                  }}
                >
                  <View
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 14,
                      backgroundColor: action.bg,
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 10,
                    }}
                  >
                    <Ionicons name={action.icon} size={24} color={action.color} />
                    {action.badge > 0 && (
                      <BadgeCount count={action.badge} />
                    )}
                  </View>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: COLORS.foreground,
                      textAlign: "center",
                    }}
                  >
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Account Footer ── */}
          <TouchableOpacity
            onPress={handleLogout}
            activeOpacity={0.82}
            style={{
              marginTop: 8,
              backgroundColor: "#FFF1F2",
              borderRadius: 18,
              borderWidth: 1,
              borderColor: "#FECDD3",
              paddingHorizontal: 18,
              paddingVertical: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              shadowColor: "#881337",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.08,
              shadowRadius: 16,
              elevation: 2,
            }}
          >
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                backgroundColor: "#FFE4E6",
                borderWidth: 1,
                borderColor: "#FDA4AF",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="log-out-outline" size={18} color="#BE123C" />
            </View>
            <View
              style={{
                flex: 1,
                minWidth: 0,
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "700",
                  color: "#BE123C",
                  letterSpacing: -0.2,
                }}
              >
                Sign out
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: "#9F1239",
                  marginTop: 2,
                }}
                numberOfLines={1}
              >
                End this session on this device
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color="#BE123C" />
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
