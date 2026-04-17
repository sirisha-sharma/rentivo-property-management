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

function StatTile({ icon, iconTint, value, label, loading }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: COLORS.surface,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 16,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: iconTint.bg,
          borderWidth: 1,
          borderColor: iconTint.border,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 14,
        }}
      >
        <Ionicons name={icon} size={18} color={iconTint.color} />
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={COLORS.primary} />
      ) : (
        <>
          <Text
            style={{
              fontSize: 26,
              fontWeight: "700",
              color: COLORS.foreground,
              letterSpacing: -0.6,
              lineHeight: 30,
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
          backgroundColor: COLORS.surface,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: COLORS.border,
          padding: 20,
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
                fontSize: 16,
                fontWeight: "700",
                color: COLORS.foreground,
                letterSpacing: -0.2,
              }}
            >
              {title}
            </Text>
          ) : null}
          {subtitle ? (
            <Text style={{ fontSize: 12, color: COLORS.mutedForeground, fontWeight: "500" }}>
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
        paddingVertical: 28,
        gap: 10,
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 16,
          backgroundColor: COLORS.surfaceElevated,
          borderWidth: 1,
          borderColor: COLORS.border,
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

function BadgeCount({ count, floating = false }) {
  if (!count) return null;
  return (
    <View
      style={{
        position: floating ? "absolute" : "relative",
        top: floating ? -6 : undefined,
        right: floating ? -6 : undefined,
        backgroundColor: COLORS.destructive,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 5,
        borderWidth: 2,
        borderColor: COLORS.background,
      }}
    >
      <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>
        {count > 9 ? "9+" : count}
      </Text>
    </View>
  );
}

// Dark-mode tint palette for stat tiles and quick actions.
const TINTS = {
  primary: { bg: COLORS.primarySoft, border: "rgba(47,123,255,0.3)", color: COLORS.primary },
  success: { bg: COLORS.successSoft, border: "rgba(16,185,129,0.3)", color: COLORS.success },
  warning: { bg: COLORS.warningSoft, border: "rgba(245,158,11,0.3)", color: COLORS.warning },
  danger: { bg: COLORS.destructiveSoft, border: "rgba(239,68,68,0.3)", color: COLORS.destructive },
  lilac: { bg: COLORS.accentLilacSoft, border: "rgba(200,210,255,0.3)", color: COLORS.accentLilac },
  teal: { bg: COLORS.accentTealSoft, border: "rgba(52,212,198,0.3)", color: COLORS.accentTealBright },
  pink: { bg: "rgba(244,114,182,0.16)", border: "rgba(244,114,182,0.3)", color: "#F472B6" },
  orange: { bg: "rgba(251,146,60,0.16)", border: "rgba(251,146,60,0.3)", color: "#FB923C" },
};

// ─── Main Component ────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const { user, logout } = useContext(AuthContext);
  const router = useRouter();

  const { unreadCount, fetchNotifications } = useContext(NotificationContext);
  const { unreadMessageCount, fetchUnreadCount } = useContext(MessageContext);
  const { subscription, fetchSubscription } =
    useContext(SubscriptionContext);
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = screenWidth - 40 - 40 - 8;

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
      { value: landlordCharts.paymentStatusBreakdown.Paid, color: COLORS.success, label: "Paid" },
      { value: landlordCharts.paymentStatusBreakdown.Pending, color: COLORS.warning, label: "Pending" },
      { value: landlordCharts.paymentStatusBreakdown.Overdue, color: COLORS.destructive, label: "Overdue" },
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
      { value: tenantCharts.paymentStatusBreakdown.Paid, color: COLORS.success, label: "Paid" },
      { value: tenantCharts.paymentStatusBreakdown.Pending, color: COLORS.warning, label: "Pending" },
      { value: tenantCharts.paymentStatusBreakdown.Overdue, color: COLORS.destructive, label: "Overdue" },
    ],
    [tenantCharts.paymentStatusBreakdown]
  );

  const hasCollectionData = monthlyCollectionData.some((d) => d.value > 0);
  const hasPaymentBreakdownData = paymentPieData.some((d) => d.value > 0);
  const hasTenantCollectionData = tenantMonthlyPaidData.some((d) => d.value > 0);
  const hasTenantPaymentBreakdownData = tenantPaymentPieData.some((d) => d.value > 0);

  useFocusEffect(
    useCallback(() => {
      if (user?.role === "admin") {
        router.replace("/admin");
        return undefined;
      }

      void fetchStats();
      void fetchNotifications();
      void fetchUnreadCount();
      if (user?.role === "landlord") {
        void fetchSubscription();
      }
      return undefined;
    }, [fetchNotifications, fetchStats, fetchSubscription, fetchUnreadCount, router, user?.role])
  );

  const handleLogout = async () => {
    await logout();
    router.replace("/");
  };

  if (user?.role === "admin") {
    return null;
  }

  const isLandlord = user?.role === "landlord";

  const landlordActions = [
    { label: "Properties", icon: "home", tint: "primary", route: "/landlord/properties" },
    { label: "Tenants", icon: "people", tint: "success", route: "/landlord/tenants" },
    { label: "Maintenance", icon: "construct", tint: "warning", route: "/landlord/maintenance" },
    { label: "Invoices", icon: "document-text", tint: "lilac", route: "/landlord/invoices" },
    { label: "Documents", icon: "folder-open", tint: "teal", route: "/landlord/documents" },
    { label: "Messages", icon: "chatbubbles", tint: "pink", route: "/messages", badge: unreadMessageCount },
    { label: "Subscription", icon: "ribbon", tint: "teal", route: "/landlord/subscription" },
  ];

  const tenantActions = [
    { label: "Browse", icon: "search", tint: "primary", route: "/tenant/marketplace" },
    { label: "Invitations", icon: "mail", tint: "lilac", route: "/tenant/invitations" },
    { label: "My Rentals", icon: "home", tint: "success", route: "/tenant/rentals" },
    { label: "Invoices", icon: "document-text", tint: "orange", route: "/tenant/invoices" },
    { label: "Maintenance", icon: "construct", tint: "danger", route: "/tenant/maintenance" },
    { label: "Documents", icon: "folder-open", tint: "teal", route: "/tenant/documents" },
    { label: "Payments", icon: "receipt", tint: "lilac", route: "/tenant/payments" },
    { label: "Messages", icon: "chatbubbles", tint: "pink", route: "/messages", badge: unreadMessageCount },
  ];

  const actions = isLandlord ? landlordActions : tenantActions;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <SafeAreaView edges={["top"]} style={{ backgroundColor: COLORS.background }} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 56 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Header ── */}
        <LinearGradient
          colors={[COLORS.primaryDeep, "#1544B8", COLORS.background]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 40,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
              <TouchableOpacity
                onPress={() => router.push("/profile")}
                activeOpacity={0.8}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 16,
                  backgroundColor: "rgba(255,255,255,0.15)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.25)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 17,
                    fontWeight: "700",
                    letterSpacing: 0.5,
                  }}
                >
                  {getInitials(user?.name)}
                </Text>
              </TouchableOpacity>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 13,
                    color: "rgba(245,247,255,0.8)",
                    fontWeight: "500",
                  }}
                >
                  {getGreeting()}
                </Text>
                <Text
                  style={{
                    fontSize: 19,
                    fontWeight: "700",
                    color: "#fff",
                    letterSpacing: -0.3,
                  }}
                  numberOfLines={1}
                >
                  {user?.name}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => router.push("/notifications")}
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: "rgba(255,255,255,0.15)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.25)",
                alignItems: "center",
                justifyContent: "center",
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="notifications-outline" size={20} color="#fff" />
              <BadgeCount count={unreadCount} floating />
            </TouchableOpacity>
          </View>

          {/* Role badge + Upgrade button row */}
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 18, gap: 8 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "rgba(255,255,255,0.16)",
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 6,
                gap: 6,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.22)",
              }}
            >
              <Ionicons
                name={isLandlord ? "home-outline" : "person-outline"}
                size={13}
                color="#fff"
              />
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: "#fff",
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                }}
              >
                {user?.role}
              </Text>
            </View>
            {isLandlord && subscription &&
              (subscription.plan === "trial" || subscription.status !== "active") && (
              <TouchableOpacity
                onPress={() => router.push("/landlord/subscription")}
                activeOpacity={0.8}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  backgroundColor: "#fff",
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
              >
                <Ionicons name="trending-up-outline" size={12} color={COLORS.primary} />
                <Text style={{ fontSize: 11, fontWeight: "700", color: COLORS.primary, letterSpacing: 0.3 }}>
                  UPGRADE
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>

        {/* ── Content ── */}
        <View style={{ paddingHorizontal: 20, marginTop: -20, gap: 16 }}>

          {/* ── Stats Grid ── */}
          {isLandlord ? (
            <>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <StatTile
                  icon="home"
                  iconTint={TINTS.primary}
                  value={stats.propertiesCount}
                  label="Properties"
                  loading={loading}
                />
                <StatTile
                  icon="people"
                  iconTint={TINTS.success}
                  value={stats.tenantsCount}
                  label="Active Tenants"
                  loading={loading}
                />
              </View>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <StatTile
                  icon="time-outline"
                  iconTint={TINTS.warning}
                  value={stats.pendingTenantsCount}
                  label="Pending Tenants"
                  loading={loading}
                />
                <StatTile
                  icon="alert-circle-outline"
                  iconTint={TINTS.danger}
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
                  iconTint={TINTS.primary}
                  value={tenantStats.activeProperties}
                  label="Active Rentals"
                  loading={loading}
                />
                <StatTile
                  icon="mail-outline"
                  iconTint={TINTS.warning}
                  value={tenantStats.pendingInvitations}
                  label="Pending Invites"
                  loading={loading}
                />
              </View>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <StatTile
                  icon="document-text-outline"
                  iconTint={TINTS.orange}
                  value={tenantStats.pendingInvoices}
                  label="Pending Invoices"
                  loading={loading}
                />
                <StatTile
                  icon="alert-circle-outline"
                  iconTint={TINTS.danger}
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
                  { label: "Total", value: isLandlord ? stats.totalInvoices : tenantStats.totalInvoices, color: COLORS.foreground },
                  { label: "Pending", value: isLandlord ? stats.pendingInvoices : tenantStats.pendingInvoices, color: COLORS.warning },
                  { label: "Paid", value: isLandlord ? stats.paidInvoices : tenantStats.paidInvoices, color: COLORS.success },
                  { label: "Overdue", value: isLandlord ? stats.overdueInvoices : tenantStats.overdueInvoices, color: COLORS.destructive },
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
                        fontSize: 24,
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
                        marginTop: 3,
                        fontWeight: "500",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
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
                    maxValue={Math.max(...monthlyCollectionData.map((d) => d.value), 0) || 100}
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
                        innerCircleColor={COLORS.surface}
                        backgroundColor={COLORS.surface}
                        textColor="#fff"
                        textSize={12}
                        centerLabelComponent={() => (
                          <View style={{ alignItems: "center" }}>
                            <Text style={{ fontSize: 11, color: COLORS.mutedForeground }}>
                              Invoices
                            </Text>
                            <Text style={{ fontSize: 20, fontWeight: "700", color: COLORS.foreground }}>
                              {stats.totalInvoices}
                            </Text>
                          </View>
                        )}
                      />
                    </View>
                    <View style={{ gap: 10, marginTop: 12 }}>
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
                          <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.foreground }}>
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
                      { label: "Occupancy Rate", value: `${landlordCharts.occupancy.occupancyRate}%`, sub: `${landlordCharts.occupancy.occupiedProperties}/${landlordCharts.occupancy.totalProperties} occupied`, tint: TINTS.primary, icon: "business-outline" },
                      { label: "Open Maintenance", value: landlordCharts.maintenanceStats.pending, sub: "Pending or in progress", tint: TINTS.warning, icon: "construct-outline" },
                      { label: "Resolved", value: landlordCharts.maintenanceStats.resolved, sub: "Completed requests", tint: TINTS.success, icon: "checkmark-circle-outline" },
                      { label: "Paid Invoices", value: stats.paidInvoices, sub: "Total paid so far", tint: TINTS.lilac, icon: "receipt-outline" },
                    ].map((item) => (
                      <View
                        key={item.label}
                        style={{
                          width: "48%",
                          backgroundColor: COLORS.surfaceElevated,
                          borderRadius: 16,
                          padding: 14,
                          borderWidth: 1,
                          borderColor: COLORS.border,
                          marginBottom: 12,
                        }}
                      >
                        <View
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 10,
                            backgroundColor: item.tint.bg,
                            borderWidth: 1,
                            borderColor: item.tint.border,
                            alignItems: "center",
                            justifyContent: "center",
                            marginBottom: 10,
                          }}
                        >
                          <Ionicons name={item.icon} size={16} color={item.tint.color} />
                        </View>
                        <Text
                          style={{
                            fontSize: 11,
                            color: COLORS.mutedForeground,
                            fontWeight: "500",
                            marginBottom: 4,
                            textTransform: "uppercase",
                            letterSpacing: 0.4,
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
                    maxValue={Math.max(...tenantMonthlyPaidData.map((d) => d.value), 0) || 100}
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
                        innerCircleColor={COLORS.surface}
                        backgroundColor={COLORS.surface}
                        textColor="#fff"
                        textSize={12}
                        centerLabelComponent={() => (
                          <View style={{ alignItems: "center" }}>
                            <Text style={{ fontSize: 11, color: COLORS.mutedForeground }}>
                              Invoices
                            </Text>
                            <Text style={{ fontSize: 20, fontWeight: "700", color: COLORS.foreground }}>
                              {tenantStats.totalInvoices}
                            </Text>
                          </View>
                        )}
                      />
                    </View>
                    <View style={{ gap: 10, marginTop: 12 }}>
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
                          <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.foreground }}>
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
                      { label: "Active Rentals", value: tenantStats.activeProperties, sub: "Current properties", tint: TINTS.primary, icon: "home-outline" },
                      { label: "Pending Invites", value: tenantStats.pendingInvitations, sub: "Waiting for action", tint: TINTS.warning, icon: "mail-outline" },
                      { label: "Open Requests", value: tenantCharts.maintenanceStats.pending + tenantCharts.maintenanceStats.inProgress, sub: "Active maintenance", tint: TINTS.danger, icon: "construct-outline" },
                      { label: "Resolved", value: tenantCharts.maintenanceStats.resolved, sub: "Completed issues", tint: TINTS.success, icon: "checkmark-circle-outline" },
                    ].map((item) => (
                      <View
                        key={item.label}
                        style={{
                          width: "48%",
                          backgroundColor: COLORS.surfaceElevated,
                          borderRadius: 16,
                          padding: 14,
                          borderWidth: 1,
                          borderColor: COLORS.border,
                          marginBottom: 12,
                        }}
                      >
                        <View
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 10,
                            backgroundColor: item.tint.bg,
                            borderWidth: 1,
                            borderColor: item.tint.border,
                            alignItems: "center",
                            justifyContent: "center",
                            marginBottom: 10,
                          }}
                        >
                          <Ionicons name={item.icon} size={16} color={item.tint.color} />
                        </View>
                        <Text
                          style={{
                            fontSize: 11,
                            color: COLORS.mutedForeground,
                            fontWeight: "500",
                            marginBottom: 4,
                            textTransform: "uppercase",
                            letterSpacing: 0.4,
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
                fontSize: 11,
                fontWeight: "700",
                color: COLORS.accentLilac,
                marginBottom: 12,
                letterSpacing: 1.2,
                textTransform: "uppercase",
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
              {actions.map((action) => {
                const tint = TINTS[action.tint] || TINTS.primary;
                return (
                  <TouchableOpacity
                    key={action.label}
                    onPress={() => router.push(action.route)}
                    activeOpacity={0.8}
                    style={{
                      width: "48%",
                      backgroundColor: COLORS.surface,
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      padding: 16,
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 54,
                        height: 54,
                        borderRadius: 16,
                        backgroundColor: tint.bg,
                        borderWidth: 1,
                        borderColor: tint.border,
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 12,
                      }}
                    >
                      <Ionicons name={action.icon} size={24} color={tint.color} />
                      {action.badge > 0 && <BadgeCount count={action.badge} floating />}
                    </View>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: COLORS.foreground,
                        textAlign: "center",
                        letterSpacing: 0.2,
                      }}
                    >
                      {action.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Sign out ── */}
          <TouchableOpacity
            onPress={handleLogout}
            activeOpacity={0.82}
            style={{
              marginTop: 8,
              backgroundColor: COLORS.surface,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: "rgba(239,68,68,0.3)",
              paddingHorizontal: 18,
              paddingVertical: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: COLORS.destructiveSoft,
                borderWidth: 1,
                borderColor: "rgba(239,68,68,0.3)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="log-out-outline" size={18} color={COLORS.destructive} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: COLORS.foreground, letterSpacing: -0.2 }}>
                Sign out
              </Text>
              <Text style={{ fontSize: 12, color: COLORS.mutedForeground, marginTop: 2 }} numberOfLines={1}>
                End this session on this device
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.destructive} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
