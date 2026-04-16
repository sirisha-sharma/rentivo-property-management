import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import { API_BASE_URL } from "../constants/config";
import { COLORS } from "../constants/theme";
import AuthInput from "../components/AuthInput";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const KeyboardContainer = Platform.OS === "ios" ? KeyboardAvoidingView : View;
  const keyboardContainerProps =
    Platform.OS === "ios"
      ? {
          behavior: "padding",
          keyboardVerticalOffset: 0,
        }
      : {};
  const isCompactAndroid = Platform.OS === "android" && height < 780;
  const surfacePadding = isCompactAndroid ? 18 : 22;

  const handleSend = async () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await axios.post(`${API_BASE_URL}/auth/forgot-password`, {
        email: email.trim().toLowerCase(),
      });
      setSent(true);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Success State ──
  if (sent) {
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
          {/* Success Icon */}
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 44,
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
            <Ionicons name="mail" size={42} color={COLORS.primary} />
          </View>

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
            Check your inbox
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: COLORS.mutedForeground,
              textAlign: "center",
              lineHeight: 22,
              marginBottom: 8,
            }}
          >
            We sent a reset code to
          </Text>
          <Text
            style={{
              fontSize: 15,
              fontWeight: "600",
              color: COLORS.foreground,
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            {email.trim().toLowerCase()}
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
            Copy the code from the email, then tap the button below to set a new password.
          </Text>

          <TouchableOpacity
            onPress={() => router.push("/reset-password")}
            activeOpacity={0.85}
            style={{
              width: "100%",
              backgroundColor: COLORS.primary,
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: "center",
              marginBottom: 14,
              shadowColor: COLORS.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 10,
              elevation: 4,
            }}
          >
            <Text
              style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}
            >
              Enter reset code
            </Text>
          </TouchableOpacity>

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

  // ── Form State ──
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <KeyboardContainer style={{ flex: 1 }} {...keyboardContainerProps}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: Platform.OS === "ios" ? "center" : undefined,
            paddingHorizontal: 24,
            paddingTop: Platform.OS === "ios" ? 24 : isCompactAndroid ? 20 : 32,
            paddingBottom: Platform.OS === "android" ? 148 : 40,
          }}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "none"}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 460,
              alignSelf: "center",
            }}
          >
            {/* Back button */}
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.7}
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: COLORS.muted,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 24,
              }}
            >
              <Ionicons name="arrow-back" size={20} color={COLORS.foreground} />
            </TouchableOpacity>

            <View
              style={{
                backgroundColor: COLORS.card,
                borderRadius: 24,
                borderWidth: 1,
                borderColor: COLORS.border,
                padding: surfacePadding,
                shadowColor: "#0F172A",
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.06,
                shadowRadius: 24,
                elevation: 4,
              }}
            >
              {/* Header */}
              <View style={{ marginBottom: 28 }}>
                <LinearGradient
                  colors={["#3B82F6", "#1D4ED8"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 20,
                    shadowColor: "#2563EB",
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.3,
                    shadowRadius: 12,
                    elevation: 6,
                  }}
                >
                  <Ionicons name="lock-closed" size={26} color="#fff" />
                </LinearGradient>

                <Text
                  style={{
                    fontSize: isCompactAndroid ? 24 : 26,
                    fontWeight: "700",
                    color: COLORS.foreground,
                    marginBottom: 8,
                    letterSpacing: -0.3,
                  }}
                >
                  Forgot password?
                </Text>
                <Text
                  style={{
                    fontSize: 15,
                    color: COLORS.mutedForeground,
                    lineHeight: 22,
                  }}
                >
                  No worries, enter your email and we&apos;ll send you a reset code.
                </Text>
              </View>

              {/* Error Banner */}
              {error ? (
                <View
                  style={{
                    backgroundColor: "#FEF2F2",
                    borderWidth: 1,
                    borderColor: "#FECACA",
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 20,
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 10,
                  }}
                >
                  <Ionicons
                    name="alert-circle"
                    size={18}
                    color={COLORS.destructive}
                    style={{ marginTop: 1 }}
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

              <View style={{ gap: 16 }}>
                <AuthInput
                  label="Email"
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    if (error) setError("");
                  }}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  leftIcon="mail-outline"
                  returnKeyType="done"
                  onSubmitEditing={handleSend}
                  textContentType="emailAddress"
                />

                <TouchableOpacity
                  onPress={handleSend}
                  disabled={loading}
                  activeOpacity={0.85}
                  style={{
                    backgroundColor: loading ? "#93C5FD" : COLORS.primary,
                    borderRadius: 14,
                    paddingVertical: 16,
                    alignItems: "center",
                    justifyContent: "center",
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
                        style={{
                          color: "#fff",
                          fontSize: 16,
                          fontWeight: "600",
                        }}
                      >
                        Sending…
                      </Text>
                    </>
                  ) : (
                    <Text
                      style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}
                    >
                      Send reset code
                    </Text>
                  )}
                </TouchableOpacity>

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    marginTop: 8,
                  }}
                >
                  <Text
                    style={{ fontSize: 14, color: COLORS.mutedForeground }}
                  >
                    Remember your password?{" "}
                  </Text>
                  <TouchableOpacity onPress={() => router.replace("/")}>
                    <Text
                      style={{
                        fontSize: 14,
                        color: COLORS.primary,
                        fontWeight: "600",
                      }}
                    >
                      Sign in
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardContainer>
    </SafeAreaView>
  );
}
