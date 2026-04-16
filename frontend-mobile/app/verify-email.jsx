import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { API_BASE_URL } from "../constants/config";
import { COLORS } from "../constants/theme";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState("");

  const handleResend = async () => {
    setLoading(true);
    setError("");
    setResent(false);
    try {
      await axios.post(`${API_BASE_URL}/auth/resend-verification`, { email });
      setResent(true);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to resend. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 32,
        }}
      >
        {/* Icon */}
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: "#EFF6FF",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 28,
            shadowColor: COLORS.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 4,
          }}
        >
          <Ionicons name="mail" size={46} color={COLORS.primary} />
        </View>

        {/* Heading */}
        <Text
          style={{
            fontSize: 24,
            fontWeight: "700",
            color: COLORS.foreground,
            textAlign: "center",
            marginBottom: 10,
            letterSpacing: -0.3,
          }}
        >
          Verify your email
        </Text>

        {/* Body */}
        <Text
          style={{
            fontSize: 15,
            color: COLORS.mutedForeground,
            textAlign: "center",
            lineHeight: 22,
            marginBottom: 4,
          }}
        >
          We sent a verification link to
        </Text>
        <Text
          style={{
            fontSize: 15,
            fontWeight: "700",
            color: COLORS.foreground,
            textAlign: "center",
            marginBottom: 12,
          }}
        >
          {email}
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: COLORS.mutedForeground,
            textAlign: "center",
            lineHeight: 21,
            marginBottom: 36,
          }}
        >
          Click the link in the email to activate your account. It expires in 24 hours.
        </Text>

        {/* Feedback banners */}
        {resent ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#ECFDF5",
              borderWidth: 1,
              borderColor: "#A7F3D0",
              borderRadius: 12,
              padding: 14,
              marginBottom: 16,
              width: "100%",
              gap: 10,
            }}
          >
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={COLORS.success}
            />
            <Text
              style={{
                color: "#065F46",
                fontSize: 14,
                flex: 1,
                lineHeight: 20,
              }}
            >
              Verification email resent successfully.
            </Text>
          </View>
        ) : null}

        {error ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#FEF2F2",
              borderWidth: 1,
              borderColor: "#FECACA",
              borderRadius: 12,
              padding: 14,
              marginBottom: 16,
              width: "100%",
              gap: 10,
            }}
          >
            <Ionicons
              name="alert-circle"
              size={18}
              color={COLORS.destructive}
            />
            <Text
              style={{
                color: COLORS.destructive,
                fontSize: 14,
                flex: 1,
                lineHeight: 20,
              }}
            >
              {error}
            </Text>
          </View>
        ) : null}

        {/* Resend button */}
        <TouchableOpacity
          onPress={handleResend}
          disabled={loading}
          activeOpacity={0.85}
          style={{
            width: "100%",
            backgroundColor: loading ? "#93C5FD" : COLORS.primary,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 14,
            shadowColor: COLORS.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: loading ? 0 : 0.25,
            shadowRadius: 10,
            elevation: loading ? 0 : 4,
            flexDirection: "row",
            gap: 8,
          }}
        >
          {loading ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text
                style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}
              >
                Sending…
              </Text>
            </>
          ) : (
            <Text
              style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}
            >
              Resend verification email
            </Text>
          )}
        </TouchableOpacity>

        {/* Back to sign in */}
        <TouchableOpacity onPress={() => router.replace("/")}>
          <Text
            style={{
              color: COLORS.mutedForeground,
              fontSize: 14,
              fontWeight: "500",
            }}
          >
            Back to sign in
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
