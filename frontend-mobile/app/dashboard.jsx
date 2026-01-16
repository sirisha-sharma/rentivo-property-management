import React, { useContext, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { AuthContext } from "../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";
import axios from "axios";
import { API_BASE_URL } from "../constants/config";

export default function DashboardScreen() {
  const { user, logout } = useContext(AuthContext);
  const router = useRouter();
  const [stats, setStats] = useState({ propertiesCount: 0, tenantsCount: 0, pendingTenantsCount: 0 });
  const [tenantStats, setTenantStats] = useState({ activeProperties: 0, pendingInvitations: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (user?.role === "landlord") {
          const response = await axios.get(`${API_BASE_URL}/dashboard/stats`, {
            headers: { Authorization: `Bearer ${user.token}` },
          });
          setStats(response.data);
        } else {
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
    }
  }, [user]);

  const handleLogout = async () => {
    await logout();
    router.replace("/");
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="p-6">
        {/* Header */}
        <View className="flex-row justify-between items-center mb-4">
          <View>
            <Text className="text-base text-mutedForeground">Welcome,</Text>
            <Text className="text-2xl font-bold text-foreground">{user?.name}</Text>
          </View>
          <TouchableOpacity>
            <Ionicons name="person-circle-outline" size={40} color={COLORS.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Role Badge */}
        <View className="flex-row items-center gap-1.5 bg-muted px-3 py-1.5 rounded-full self-start mb-8">
          <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.primary} />
          <Text className="text-sm font-semibold text-foreground">{user?.role?.toUpperCase()}</Text>
        </View>

        {/* Overview Card */}
        <View className="bg-card rounded-2xl border border-border p-5 mb-8 shadow-sm">
          <Text className="text-base font-semibold text-foreground mb-4">Overview</Text>
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <View className="flex-row justify-between">
              {user?.role === "landlord" ? (
                <>
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

        {/* Menu Grid */}
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
              onPress={() => { }}
            >
              <View className="w-12 h-12 rounded-xl items-center justify-center mb-3 bg-orange-100">
                <Ionicons name="alert-circle" size={24} color={COLORS.warning} />
              </View>
              <Text className="text-sm font-semibold text-foreground">Issues</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="w-[47%] bg-card rounded-2xl border border-border p-4 items-center"
              onPress={() => { }}
            >
              <View className="w-12 h-12 rounded-xl items-center justify-center mb-3 bg-purple-100">
                <Ionicons name="document-text" size={24} color="#9333EA" />
              </View>
              <Text className="text-sm font-semibold text-foreground">Invoices</Text>
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
              onPress={() => { }}
            >
              <View className="w-12 h-12 rounded-xl items-center justify-center mb-3 bg-green-100">
                <Ionicons name="home" size={24} color={COLORS.success} />
              </View>
              <Text className="text-sm font-semibold text-foreground">My Rentals</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="w-[47%] bg-card rounded-2xl border border-border p-4 items-center"
              onPress={() => { }}
            >
              <View className="w-12 h-12 rounded-xl items-center justify-center mb-3 bg-orange-100">
                <Ionicons name="document-text" size={24} color={COLORS.warning} />
              </View>
              <Text className="text-sm font-semibold text-foreground">Invoices</Text>
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
