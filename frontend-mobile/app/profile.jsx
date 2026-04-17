import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  StatusBar,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { API_BASE_URL } from "../constants/config";
import { COLORS } from "../constants/theme";

function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

export default function ProfileScreen() {
  const { user, login, logout } = useContext(AuthContext);
  const router = useRouter();

  const [is2faEnabled, setIs2faEnabled] = useState(user?.is2faEnabled ?? false);
  const [toggling, setToggling] = useState(false);

  const handle2FAToggle = async (value) => {
    setToggling(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/toggle-2fa`,
        {},
        { headers: { Authorization: `Bearer ${user?.token}` } }
      );

      setIs2faEnabled(response.data.is2faEnabled);
      await login({ ...user, is2faEnabled: response.data.is2faEnabled });
    } catch (err) {
      Alert.alert(
        "Error",
        err.response?.data?.message || "Could not update 2FA setting. Please try again."
      );
    } finally {
      setToggling(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/");
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 16,
            marginBottom: 8,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: COLORS.surfaceElevated,
              borderWidth: 1,
              borderColor: COLORS.border,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <Ionicons name="arrow-back" size={20} color={COLORS.foreground} />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: "700", color: COLORS.foreground }}>
            Profile & Settings
          </Text>
        </View>

        {/* Avatar card */}
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: COLORS.border,
            padding: 24,
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 22,
              backgroundColor: COLORS.primarySoft,
              borderWidth: 2,
              borderColor: COLORS.primary,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <Text style={{ fontSize: 26, fontWeight: "700", color: COLORS.primary }}>
              {getInitials(user?.name)}
            </Text>
          </View>
          <Text
            style={{ fontSize: 20, fontWeight: "700", color: COLORS.foreground, marginBottom: 4 }}
          >
            {user?.name}
          </Text>
          <Text style={{ fontSize: 14, color: COLORS.mutedForeground, marginBottom: 8 }}>
            {user?.email}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: COLORS.primarySoft,
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 5,
              gap: 5,
            }}
          >
            <Ionicons
              name={user?.role === "landlord" ? "home-outline" : "person-outline"}
              size={12}
              color={COLORS.primary}
            />
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: COLORS.primary,
                letterSpacing: 0.6,
                textTransform: "uppercase",
              }}
            >
              {user?.role}
            </Text>
          </View>
        </View>

        {/* Security section */}
        <Text
          style={{
            fontSize: 12,
            fontWeight: "700",
            color: COLORS.mutedForeground,
            letterSpacing: 0.8,
            textTransform: "uppercase",
            marginBottom: 10,
            marginLeft: 4,
          }}
        >
          Security
        </Text>

        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: COLORS.border,
            overflow: "hidden",
            marginBottom: 16,
          }}
        >
          {/* 2FA toggle row */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 18,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: is2faEnabled ? COLORS.successSoft : COLORS.surfaceElevated,
                borderWidth: 1,
                borderColor: is2faEnabled ? COLORS.success : COLORS.border,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 14,
              }}
            >
              {toggling ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color={is2faEnabled ? COLORS.success : COLORS.mutedForeground}
                />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: COLORS.foreground }}>
                Two-Factor Authentication
              </Text>
              <Text style={{ fontSize: 13, color: COLORS.mutedForeground, marginTop: 2 }}>
                {is2faEnabled
                  ? "A code is emailed to you on each sign-in"
                  : "Add an extra layer of security to your account"}
              </Text>
            </View>
            <Switch
              value={is2faEnabled}
              onValueChange={handle2FAToggle}
              disabled={toggling}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor="#fff"
              ios_backgroundColor={COLORS.border}
            />
          </View>
        </View>

        {/* Account section */}
        <Text
          style={{
            fontSize: 12,
            fontWeight: "700",
            color: COLORS.mutedForeground,
            letterSpacing: 0.8,
            textTransform: "uppercase",
            marginBottom: 10,
            marginLeft: 4,
          }}
        >
          Account
        </Text>

        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: COLORS.border,
            overflow: "hidden",
            marginBottom: 16,
          }}
        >
          <TouchableOpacity
            onPress={() => router.push("/forgot-password")}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 18,
              borderBottomWidth: 1,
              borderBottomColor: COLORS.border,
            }}
            activeOpacity={0.7}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: COLORS.surfaceElevated,
                borderWidth: 1,
                borderColor: COLORS.border,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 14,
              }}
            >
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.mutedForeground} />
            </View>
            <Text style={{ fontSize: 15, fontWeight: "500", color: COLORS.foreground, flex: 1 }}>
              Change Password
            </Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.faintForeground} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogout}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 18,
            }}
            activeOpacity={0.7}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: COLORS.destructiveSoft,
                borderWidth: 1,
                borderColor: "rgba(239,68,68,0.25)",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 14,
              }}
            >
              <Ionicons name="log-out-outline" size={20} color={COLORS.destructive} />
            </View>
            <Text style={{ fontSize: 15, fontWeight: "500", color: COLORS.destructive, flex: 1 }}>
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
