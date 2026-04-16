import React, { useState, useRef } from "react";
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
  findNodeHandle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import { API_BASE_URL } from "../constants/config";
import { COLORS } from "../constants/theme";
import AuthInput from "../components/AuthInput";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const scrollViewRef = useRef(null);
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
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

  const newPasswordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  const scrollToInput = (inputRef, extraOffset = 140) => {
    if (Platform.OS !== "android") {
      return;
    }

    const nodeHandle = findNodeHandle(inputRef?.current);
    const scrollResponder =
      scrollViewRef.current?.getScrollResponder?.() ?? scrollViewRef.current;

    if (!nodeHandle || !scrollResponder) {
      return;
    }

    requestAnimationFrame(() => {
      setTimeout(() => {
        scrollResponder.scrollResponderScrollNativeHandleToKeyboard?.(
          nodeHandle,
          extraOffset,
          true
        );
      }, 120);
    });
  };

  const validate = () => {
    const newErrors = {};
    if (!token.trim()) newErrors.token = "Reset code is required";
    if (!newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters";
    }
    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your new password";
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords don't match";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleReset = async () => {
    if (!validate()) return;

    setLoading(true);
    setApiError("");
    try {
      await axios.post(`${API_BASE_URL}/auth/reset-password/${token.trim()}`, {
        newPassword,
      });
      setSuccess(true);
    } catch (err) {
      setApiError(
        err.response?.data?.message ||
          "Failed to reset password. The code may be invalid or expired."
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Success State ──
  if (success) {
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
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 44,
              backgroundColor: "#ECFDF5",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 28,
              shadowColor: COLORS.success,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 4,
            }}
          >
            <Ionicons name="checkmark-circle" size={46} color={COLORS.success} />
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
            Password updated
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: COLORS.mutedForeground,
              textAlign: "center",
              lineHeight: 22,
              marginBottom: 40,
            }}
          >
            Your password has been successfully reset. You can now sign in with your new password.
          </Text>

          <TouchableOpacity
            onPress={() => router.replace("/")}
            activeOpacity={0.85}
            style={{
              width: "100%",
              backgroundColor: COLORS.primary,
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: "center",
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
          ref={scrollViewRef}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: Platform.OS === "ios" ? "center" : undefined,
            paddingHorizontal: 24,
            paddingTop: Platform.OS === "ios" ? 24 : isCompactAndroid ? 20 : 32,
            paddingBottom: Platform.OS === "android" ? 164 : 40,
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
                  <Ionicons name="key" size={26} color="#fff" />
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
                  Reset password
                </Text>
                <Text
                  style={{
                    fontSize: 15,
                    color: COLORS.mutedForeground,
                    lineHeight: 22,
                  }}
                >
                  Paste the reset code from your email and choose a strong new password.
                </Text>
              </View>

              {/* API Error Banner */}
              {apiError ? (
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
                    {apiError}
                  </Text>
                </View>
              ) : null}

              <View style={{ gap: 16 }}>
                {/* Reset code field */}
                <AuthInput
                  label="Reset code"
                  value={token}
                  onChangeText={(t) => {
                    setToken(t);
                    if (errors.token)
                      setErrors((e) => ({ ...e, token: "" }));
                  }}
                  placeholder="Paste the code from your email"
                  leftIcon="shield-checkmark-outline"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => newPasswordRef.current?.focus()}
                  textContentType="oneTimeCode"
                  error={errors.token}
                />

                <AuthInput
                  ref={newPasswordRef}
                  label="New password"
                  value={newPassword}
                  onChangeText={(t) => {
                    setNewPassword(t);
                    if (errors.newPassword)
                      setErrors((e) => ({ ...e, newPassword: "" }));
                  }}
                  placeholder="Min. 8 characters"
                  isPassword
                  showPassword={showPassword}
                  onTogglePassword={() => setShowPassword((s) => !s)}
                  leftIcon="lock-closed-outline"
                  returnKeyType="next"
                  onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                  onFocus={() => scrollToInput(newPasswordRef, 145)}
                  textContentType="newPassword"
                  error={errors.newPassword}
                />

                <AuthInput
                  ref={confirmPasswordRef}
                  label="Confirm new password"
                  value={confirmPassword}
                  onChangeText={(t) => {
                    setConfirmPassword(t);
                    if (errors.confirmPassword)
                      setErrors((e) => ({ ...e, confirmPassword: "" }));
                  }}
                  placeholder="Re-enter your new password"
                  isPassword
                  showPassword={showConfirmPassword}
                  onTogglePassword={() => setShowConfirmPassword((s) => !s)}
                  leftIcon="lock-closed-outline"
                  returnKeyType="done"
                  onSubmitEditing={handleReset}
                  onFocus={() => scrollToInput(confirmPasswordRef, 175)}
                  textContentType="newPassword"
                  error={errors.confirmPassword}
                />

                <TouchableOpacity
                  onPress={handleReset}
                  disabled={loading}
                  activeOpacity={0.85}
                  style={{
                    backgroundColor: loading ? "#93C5FD" : COLORS.primary,
                    borderRadius: 14,
                    paddingVertical: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 4,
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
                        Resetting…
                      </Text>
                    </>
                  ) : (
                    <Text
                      style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}
                    >
                      Reset password
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardContainer>
    </SafeAreaView>
  );
}
