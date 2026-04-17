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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BarChart, PieChart } from "react-native-gifted-charts";
import { AuthContext } from "../../context/AuthContext";
import { NotificationContext } from "../../context/NotificationContext";
import { COLORS } from "../../constants/theme";
import { getAdminOverview } from "../../api/admin";

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

function StatTile({ icon, tint, value, label, loading }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 14,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: tint.bg,
          borderWidth: 1,
          borderColor: tint.border,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 10,
        }}
      >
        <Ionicons name={icon} size={16} color={tint.color} />
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={COLORS.primary} />
      ) : (
        <>
          <Text
            style={{
              fontSize: 22,
              fontWeight: "700",
              color: COLORS.foreground,
              letterSpacing: -0.5,
              lineHeight: 26,
            }}
          >
            {value}
          </Text>
          <Text
            style={{
              fontSize: 11,
              color: COLORS.mutedForeground,
              marginTop: 3,
              fontWeight: "500",
            }}
            numberOfLines={1}
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
          borderRadius: 18,
          borderWidth: 1,
          borderColor: COLORS.border,
          padding: 16,
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
            marginBottom: 14,
          }}
        >
          {title ? (
            <Text
              style={{
                fontSize: 15,
                fontWeight: "700",
                color: COLORS.foreground,
                letterSpacing: -0.2,
              }}
            >
              {title}
            </Text>
          ) : null}
          {subtitle ? (
            <Text style={{ fontSize: 11, color: COLORS.mutedForeground, fontWeight: "500" }}>
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
    <View style={{ alignItems: "center", paddingVertical: 24, gap: 8 }}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          backgroundColor: COLORS.surfaceElevated,
          borderWidth: 1,
          borderColor: COLORS.border,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="bar-chart-outline" size={20} color={COLORS.mutedForeground} />
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
        minWidth: 18,
        height: 18,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 4,
        borderWidth: 2,
        borderColor: COLORS.background,
      }}
    >
      <Text style={{ color: "#fff", fontSize: 9, fontWeight: "800" }}>
        {count > 9 ? "9+" : count}
      </Text>
    </View>
  );
}

function RecentRow({ icon, tint, title, subtitle, meta }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: tint.bg,
          borderWidth: 1,
          borderColor: tint.border,
        }}
      >
        <Ionicons name={icon} size={18} color={tint.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: "600",
            color: COLORS.foreground,
          }}
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text
          style={{
            fontSize: 12,
            color: COLORS.mutedForeground,
            marginTop: 2,
          }}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      </View>
      <Text
        style={{
          fontSize: 11,
          color: COLORS.mutedForeground,
          fontWeight: "600",
        }}
      >
        {meta}
      </Text>
    </View>
  );
}

function SnapshotTile({ label, value, sub, tint, icon }) {
  return (
    <View
      style={{
        width: "48%",
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: 14,
        padding: 13,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 10,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 9,
          backgroundColor: tint.bg,
          borderWidth: 1,
          borderColor: tint.border,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 8,
        }}
      >
        <Ionicons name={icon} size={14} color={tint.color} />
      </View>
      <Text
        style={{
          fontSize: 10,
          color: COLORS.mutedForeground,
          fontWeight: "600",
          marginBottom: 3,
          textTransform: "uppercase",
          letterSpacing: 0.4,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: 20,
          fontWeight: "700",
          color: COLORS.foreground,
          letterSpacing: -0.5,
        }}
      >
        {value}
      </Text>
      <Text
        style={{ fontSize: 10, color: COLORS.mutedForeground, marginTop: 2 }}
        numberOfLines={2}
      >
        {sub}
      </Text>
    </View>
  );
}

const TINTS = {
  primary: { bg: COLORS.primarySoft, border: "rgba(47,123,255,0.3)", color: COLORS.primary },
  success: { bg: COLORS.successSoft, border: "rgba(16,185,129,0.3)", color: COLORS.success },
  warning: { bg: COLORS.warningSoft, border: "rgba(245,158,11,0.3)", color: COLORS.warning },
  danger: { bg: COLORS.destructiveSoft, border: "rgba(239,68,68,0.3)", color: COLORS.destructive },
  lilac: { bg: COLORS.accentLilacSoft, border: "rgba(200,210,255,0.3)", color: COLORS.accentLilac },
  teal: { bg: COLORS.accentTealSoft, border: "rgba(52,212,198,0.3)", color: COLORS.accentTealBright },
  orange: { bg: "rgba(251,146,60,0.16)", border: "rgba(251,146,60,0.3)", color: "#FB923C" },
};

const EMPTY_OVERVIEW = {
  summary: {
    totalUsers: 0,
    landlordCount: 0,
    tenantCount: 0,
    adminCount: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    verifiedUsers: 0,
    totalProperties: 0,
    vacantProperties: 0,
    occupiedProperties: 0,
    maintenanceProperties: 0,
    activeTenancies: 0,
    pendingTenancies: 0,
    pastTenancies: 0,
    totalInvoices: 0,
    pendingInvoices: 0,
    paidInvoices: 0,
    overdueInvoices: 0,
    openMaintenance: 0,
    inProgressMaintenance: 0,
    resolvedMaintenance: 0,
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    trialSubscriptions: 0,
    expiredSubscriptions: 0,
    pendingSubscriptions: 0,
  },
  charts: {
    userSignups: [],
    propertyStatusBreakdown: {
      occupied: 0,
      vacant: 0,
      maintenance: 0,
    },
    invoiceStatusBreakdown: {
      Paid: 0,
      Pending: 0,
      Overdue: 0,
    },
  },
  recents: {
    users: [],
    properties: [],
    maintenance: [],
  },
};

// ── Tab definitions ─────────────────────────────────────────────────────────
const TABS = [
  { key: "home", label: "Home", icon: "home-outline", activeIcon: "home" },
  { key: "actions", label: "Actions", icon: "apps-outline", activeIcon: "apps" },
  { key: "charts", label: "Analytics", icon: "stats-chart-outline", activeIcon: "stats-chart" },
  { key: "activity", label: "Activity", icon: "pulse-outline", activeIcon: "pulse" },
];

// ── Main Component ──────────────────────────────────────────────────────────

export default function AdminDashboardScreen() {
  const { user, logout } = useContext(AuthContext);
  const { unreadCount, fetchNotifications } = useContext(NotificationContext);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = screenWidth - 64;
  const [overview, setOverview] = useState(EMPTY_OVERVIEW);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("home");

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAdminOverview();
      setOverview(response);
    } catch (error) {
      console.log("Failed to fetch admin overview:", error);
    } finally {
      setLoading(false);
    }
  }, []);

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

      void fetchOverview();
      void fetchNotifications();
      return undefined;
    }, [fetchNotifications, fetchOverview, router, user?.role, user?.token])
  );

  const handleLogout = async () => {
    await logout();
    router.replace("/");
  };

  const userSignupData = useMemo(
    () =>
      (overview.charts.userSignups || []).map((item) => ({
        value: item.value,
        label: item.label,
        frontColor: COLORS.primary,
        topLabelComponent: () => (
          <Text style={{ fontSize: 9, color: COLORS.mutedForeground }}>
            {item.value > 0 ? `${item.value}` : ""}
          </Text>
        ),
      })),
    [overview.charts.userSignups]
  );

  const propertyStatusPieData = useMemo(
    () => [
      { value: overview.charts.propertyStatusBreakdown.occupied, color: COLORS.success, label: "Occupied" },
      { value: overview.charts.propertyStatusBreakdown.vacant, color: COLORS.warning, label: "Vacant" },
      { value: overview.charts.propertyStatusBreakdown.maintenance, color: COLORS.info, label: "Maintenance" },
    ],
    [overview.charts.propertyStatusBreakdown]
  );

  const hasSignupData = userSignupData.some((item) => item.value > 0);
  const hasPropertyStatusData = propertyStatusPieData.some((item) => item.value > 0);

  const actions = [
    { label: "Users", icon: "people", tint: "primary", route: "/admin/users" },
    { label: "Properties", icon: "home", tint: "success", route: "/admin/properties" },
    { label: "Tenancies", icon: "git-network", tint: "warning", route: "/admin/tenancies" },
    { label: "Invoices", icon: "document-text", tint: "lilac", route: "/admin/invoices" },
    { label: "Maintenance", icon: "construct", tint: "danger", route: "/admin/maintenance" },
    { label: "Subscriptions", icon: "ribbon", tint: "teal", route: "/admin/subscriptions" },
  ];

  if (user?.role !== "admin") {
    return null;
  }

  // ── Invoice Summary Strip ──────────────────────────────────────────────────
  const InvoiceSummaryStrip = () => (
    <SectionCard title="Invoice Summary" style={{ marginTop: 12 }}>
      {loading ? (
        <ActivityIndicator size="small" color={COLORS.primary} />
      ) : (
        <View style={{ flexDirection: "row" }}>
          {[
            { label: "Total", value: overview.summary.totalInvoices, color: COLORS.foreground },
            { label: "Pending", value: overview.summary.pendingInvoices, color: COLORS.warning },
            { label: "Paid", value: overview.summary.paidInvoices, color: COLORS.success },
            { label: "Overdue", value: overview.summary.overdueInvoices, color: COLORS.destructive },
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
                  textAlign: "center",
                  minWidth: 40,
                }}
              >
                {item.value}
              </Text>
              <Text
                style={{
                  fontSize: 10,
                  color: COLORS.mutedForeground,
                  marginTop: 3,
                  fontWeight: "500",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  textAlign: "center",
                }}
              >
                {item.label}
              </Text>
            </View>
          ))}
        </View>
      )}
    </SectionCard>
  );

  // ── Tab Content Renderers ──────────────────────────────────────────────────

  const renderHomeTab = () => (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <StatTile
          icon="people"
          tint={TINTS.primary}
          value={overview.summary.totalUsers}
          label="Total Users"
          loading={loading}
        />
        <StatTile
          icon="home"
          tint={TINTS.success}
          value={overview.summary.totalProperties}
          label="Properties"
          loading={loading}
        />
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <StatTile
          icon="document-text-outline"
          tint={TINTS.lilac}
          value={overview.summary.totalInvoices}
          label="Invoices"
          loading={loading}
        />
        <StatTile
          icon="construct-outline"
          tint={TINTS.warning}
          value={overview.summary.openMaintenance + overview.summary.inProgressMaintenance}
          label="Active Maintenance"
          loading={loading}
        />
      </View>

      <SectionCard title="Platform Summary">
        {loading ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : (
          <View style={{ flexDirection: "row" }}>
            {[
              { label: "Landlords", value: overview.summary.landlordCount, color: COLORS.primary },
              { label: "Tenants", value: overview.summary.tenantCount, color: COLORS.success },
              { label: "Admins", value: overview.summary.adminCount, color: COLORS.accentLilac },
              { label: "Inactive", value: overview.summary.inactiveUsers, color: COLORS.destructive },
            ].map((item, idx, arr) => (
              <View
                key={item.label}
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "flex-end",
                  borderRightWidth: idx < arr.length - 1 ? 1 : 0,
                  borderRightColor: COLORS.border,
                  paddingVertical: 4,
                }}
              >
                <Text
                  style={{
                    fontSize: 24,
                    fontWeight: "700",
                    color: item.color,
                    letterSpacing: -0.5,
                    textAlign: "center",
                    minWidth: 40,
                  }}
                >
                  {item.value}
                </Text>
                <Text
                  style={{
                    fontSize: 10,
                    color: COLORS.mutedForeground,
                    marginTop: 4,
                    fontWeight: "500",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    textAlign: "center",
                  }}
                >
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
        )}
      </SectionCard>

      <InvoiceSummaryStrip />
    </View>
  );

  const renderActionsTab = () => (
    <View style={{ gap: 14 }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: "700",
          color: COLORS.accentLilac,
          letterSpacing: 1.2,
          textTransform: "uppercase",
        }}
      >
        Quick Actions
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
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
                borderRadius: 18,
                borderWidth: 1,
                borderColor: COLORS.border,
                padding: 14,
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: tint.bg,
                  borderWidth: 1,
                  borderColor: tint.border,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 10,
                }}
              >
                <Ionicons name={action.icon} size={22} color={tint.color} />
              </View>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: COLORS.foreground,
                  textAlign: "center",
                  letterSpacing: 0.2,
                }}
                numberOfLines={1}
              >
                {action.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        onPress={handleLogout}
        activeOpacity={0.82}
        style={{
          backgroundColor: COLORS.surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "rgba(239,68,68,0.3)",
          paddingHorizontal: 16,
          paddingVertical: 14,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 11,
            backgroundColor: COLORS.destructiveSoft,
            borderWidth: 1,
            borderColor: "rgba(239,68,68,0.3)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="log-out-outline" size={17} color={COLORS.destructive} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: COLORS.foreground, letterSpacing: -0.2 }}>
            Sign out
          </Text>
          <Text style={{ fontSize: 11, color: COLORS.mutedForeground, marginTop: 2 }} numberOfLines={1}>
            End this admin session on this device
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={COLORS.destructive} />
      </TouchableOpacity>
    </View>
  );

  const renderChartsTab = () => (
    <View style={{ gap: 14 }}>
      <SectionCard title="User Growth" subtitle="Last 6 months">
        {loading ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : !hasSignupData ? (
          <EmptyChartState message="No recent user registration data yet." />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <BarChart
              data={userSignupData}
              width={chartWidth}
              barWidth={24}
              spacing={14}
              roundedTop
              roundedBottom
              hideRules
              xAxisThickness={1}
              yAxisThickness={0}
              xAxisColor={COLORS.border}
              yAxisTextStyle={{ color: COLORS.mutedForeground, fontSize: 9 }}
              xAxisLabelTextStyle={{ color: COLORS.mutedForeground, fontSize: 10 }}
              noOfSections={4}
              maxValue={Math.max(...userSignupData.map((d) => d.value), 0) || 4}
            />
          </ScrollView>
        )}
      </SectionCard>

      <SectionCard title="Property Status">
        {loading ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : !hasPropertyStatusData ? (
          <EmptyChartState message="No property status data available yet." />
        ) : (
          <>
            <View style={{ alignItems: "center", marginBottom: 4 }}>
              <PieChart
                data={propertyStatusPieData}
                donut
                radius={Math.min(88, (screenWidth - 80) / 2)}
                innerRadius={Math.min(54, (screenWidth - 80) / 3.2)}
                innerCircleColor={COLORS.surface}
                backgroundColor={COLORS.surface}
                textColor="#fff"
                textSize={11}
                centerLabelComponent={() => (
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ fontSize: 10, color: COLORS.mutedForeground }}>Properties</Text>
                    <Text style={{ fontSize: 18, fontWeight: "700", color: COLORS.foreground }}>
                      {overview.summary.totalProperties}
                    </Text>
                  </View>
                )}
              />
            </View>
            <View style={{ gap: 10, marginTop: 12 }}>
              {propertyStatusPieData.map((item) => (
                <View
                  key={item.label}
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.color }} />
                    <Text style={{ fontSize: 14, color: COLORS.foreground }}>{item.label}</Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.foreground }}>{item.value}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </SectionCard>
    </View>
  );

  const renderActivityTab = () => (
    <View style={{ gap: 14 }}>
      <SectionCard title="Operations Snapshot">
        {loading ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "space-between",
            }}
          >
            {[
              { label: "Active Subs", value: overview.summary.activeSubscriptions, sub: "Paid subscriptions", tint: TINTS.teal, icon: "ribbon-outline" },
              { label: "Pending Tenancies", value: overview.summary.pendingTenancies, sub: "Waiting for response", tint: TINTS.warning, icon: "mail-open-outline" },
              { label: "Overdue Invoices", value: overview.summary.overdueInvoices, sub: "Require follow-up", tint: TINTS.danger, icon: "alert-circle-outline" },
              { label: "Verified Users", value: overview.summary.verifiedUsers, sub: "Email verified", tint: TINTS.success, icon: "checkmark-circle-outline" },
            ].map((item) => (
              <SnapshotTile key={item.label} {...item} />
            ))}
          </View>
        )}
      </SectionCard>

      <SectionCard title="Recent Users" subtitle="Newest accounts">
        {loading ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : overview.recents.users.length === 0 ? (
          <EmptyChartState message="No user activity yet." />
        ) : (
          overview.recents.users.map((item, index, array) => (
            <View
              key={item._id}
              style={{
                borderBottomWidth: index < array.length - 1 ? 1 : 0,
                borderBottomColor: COLORS.border,
              }}
            >
              <RecentRow
                icon={item.role === "landlord" ? "home-outline" : item.role === "tenant" ? "person-outline" : "shield-checkmark-outline"}
                tint={item.role === "admin" ? TINTS.teal : item.role === "landlord" ? TINTS.primary : TINTS.success}
                title={item.name}
                subtitle={`${item.email} \u2022 ${item.role}`}
                meta={item.isActive ? "Active" : "Inactive"}
              />
            </View>
          ))
        )}
      </SectionCard>

      <SectionCard title="Recent Maintenance" subtitle="Latest issues">
        {loading ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : overview.recents.maintenance.length === 0 ? (
          <EmptyChartState message="No maintenance requests yet." />
        ) : (
          overview.recents.maintenance.map((item, index, array) => (
            <View
              key={item._id}
              style={{
                borderBottomWidth: index < array.length - 1 ? 1 : 0,
                borderBottomColor: COLORS.border,
              }}
            >
              <RecentRow
                icon="construct-outline"
                tint={item.status === "Resolved" ? TINTS.success : item.status === "In Progress" ? TINTS.primary : TINTS.warning}
                title={item.title}
                subtitle={`${item.propertyTitle} \u2022 ${item.tenantName}`}
                meta={item.status}
              />
            </View>
          ))
        )}
      </SectionCard>
    </View>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "home": return renderHomeTab();
      case "actions": return renderActionsTab();
      case "charts": return renderChartsTab();
      case "activity": return renderActivityTab();
      default: return renderHomeTab();
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <SafeAreaView edges={["top"]} style={{ backgroundColor: COLORS.background }} />

      {/* ── Hero Header (persistent) ── */}
      <LinearGradient
        colors={[COLORS.primaryDeep, "#1544B8", COLORS.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 24 }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
            <View
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
            >
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.5 }}>
                {getInitials(user?.name)}
              </Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: "rgba(245,247,255,0.75)", fontWeight: "500" }}>
                {getGreeting()}
              </Text>
              <Text
                style={{ fontSize: 17, fontWeight: "700", color: "#fff", letterSpacing: -0.3 }}
                numberOfLines={1}
              >
                {user?.name}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => router.push("/notifications")}
            style={{
              width: 42,
              height: 42,
              borderRadius: 13,
              backgroundColor: "rgba(255,255,255,0.15)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.25)",
              alignItems: "center",
              justifyContent: "center",
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="notifications-outline" size={19} color="#fff" />
            <BadgeCount count={unreadCount} floating />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12, gap: 8 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "rgba(255,255,255,0.16)",
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 5,
              gap: 5,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.22)",
            }}
          >
            <Ionicons name="shield-checkmark-outline" size={12} color="#fff" />
            <Text style={{ fontSize: 10, fontWeight: "700", color: "#fff", letterSpacing: 0.6, textTransform: "uppercase" }}>
              admin
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── Tab Content ── */}
      <ScrollView
        key={activeTab}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}
      </ScrollView>

      {/* ── Bottom Tab Bar ── */}
      <View
        style={{
          flexDirection: "row",
          backgroundColor: COLORS.surface,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
              style={{
                flex: 1,
                alignItems: "center",
                paddingTop: 10,
                paddingBottom: 4,
              }}
            >
              {isActive && (
                <View
                  style={{
                    position: "absolute",
                    top: 0,
                    width: 28,
                    height: 3,
                    borderRadius: 99,
                    backgroundColor: COLORS.primary,
                  }}
                />
              )}
              <Ionicons
                name={isActive ? tab.activeIcon : tab.icon}
                size={21}
                color={isActive ? COLORS.primary : COLORS.mutedForeground}
              />
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: isActive ? "700" : "500",
                  color: isActive ? COLORS.primary : COLORS.mutedForeground,
                  marginTop: 3,
                  letterSpacing: 0.2,
                }}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
