import React, { useState, useContext, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
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
import { AuthContext } from "../context/AuthContext";
import { API_BASE_URL } from "../constants/config";
import { COLORS } from "../constants/theme";
import AuthInput from "../components/AuthInput";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState("landlord");
  const [error, setError] = useState("");
  const [unverifiedEmail, setUnverifiedEmail] = useState("");

  const { login } = useContext(AuthContext);
  const router = useRouter();
  const { height } = useWindowDimensions();

  const scrollViewRef = useRef(null);
  const passwordRef = useRef(null);
  const KeyboardContainer = Platform.OS === "ios" ? KeyboardAvoidingView : View;
  const keyboardContainerProps =
    Platform.OS === "ios"
      ? {
          behavior: "padding",
          keyboardVerticalOffset: 0,
        }
      : {};
  const isCompactAndroid = Platform.OS === "android" && height < 780;
  const heroSize = isCompactAndroid ? 64 : 72;
  const heroMarginBottom = isCompactAndroid ? 28 : 36;
  const surfacePadding = isCompactAndroid ? 18 : 22;

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

  const validateForm = () => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address");
      return false;
    }
    if (!password) {
      setError("Password is required");
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError("");

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: email.trim().toLowerCase(),
        password,
        selectedRole: role,
      });

      if (response.data.needs2FA) {
        router.push(
          `/verify-2fa?userId=${response.data.userId}&email=${encodeURIComponent(
            email.trim().toLowerCase()
          )}`
        );
        return;
      }

      await login(response.data);
      router.replace(response.data.role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      const responseData = err.response?.data || {};

      if (
        err.response?.status === 403 &&
        responseData?.needsVerification
      ) {
        setUnverifiedEmail(responseData.email || email);
        setError("Please verify your email before logging in.");
      } else if (responseData?.code === "ROLE_MISMATCH") {
        setUnverifiedEmail("");
        setError("");
        Alert.alert("Role mismatch", responseData.message || "Please choose the correct role for this account.");
      } else if (responseData?.code === "ACCOUNT_DEACTIVATED") {
        setUnverifiedEmail("");
        setError("");
        Alert.alert("Account disabled", responseData.message || "This account has been disabled.");
      } else {
        setUnverifiedEmail("");
        setError(responseData.message || "Invalid email or password");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <KeyboardContainer style={{ flex: 1 }} {...keyboardContainerProps}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: Platform.OS === "ios" ? "center" : undefined,
            paddingHorizontal: 24,
            paddingTop: Platform.OS === "ios" ? 32 : isCompactAndroid ? 24 : 36,
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
            {/* brand / hero  */}
            <View style={{ alignItems: "center", marginBottom: heroMarginBottom }}>
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: heroSize,
                  height: heroSize,
                  borderRadius: isCompactAndroid ? 18 : 20,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: isCompactAndroid ? 14 : 16,
                  shadowColor: COLORS.primary,
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.5,
                  shadowRadius: 18,
                  elevation: 10,
                }}
              >
                <Ionicons
                  name="home"
                  size={isCompactAndroid ? 30 : 34}
                  color="#fff"
                />
              </LinearGradient>

              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  letterSpacing: 3,
                  color: COLORS.primary,
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Rentivo
              </Text>
              <Text
                style={{
                  fontSize: isCompactAndroid ? 24 : 26,
                  fontWeight: "700",
                  color: COLORS.foreground,
                  marginBottom: 6,
                  letterSpacing: -0.3,
                }}
              >
                Welcome back
              </Text>
              <Text
                style={{
                  fontSize: 15,
                  color: COLORS.mutedForeground,
                  textAlign: "center",
                }}
              >
                Sign in to manage your properties
              </Text>
            </View>

            <View
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 28,
                borderWidth: 1,
                borderColor: COLORS.border,
                padding: surfacePadding,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 18 },
                shadowOpacity: 0.35,
                shadowRadius: 28,
                elevation: 10,
              }}
            >
              {/* error banner  */}
              {error ? (
                <View
                  style={{
                    backgroundColor: COLORS.destructiveSoft,
                    borderWidth: 1,
                    borderColor: "rgba(239,68,68,0.35)",
                    borderRadius: 14,
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
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: COLORS.destructive,
                        fontSize: 14,
                        lineHeight: 20,
                      }}
                    >
                      {error}
                    </Text>
                    {unverifiedEmail ? (
                      <TouchableOpacity
                        style={{ marginTop: 6 }}
                        onPress={() =>
                          router.push(
                            `/verify-email?email=${encodeURIComponent(
                              unverifiedEmail
                            )}`
                          )
                        }
                      >
                        <Text
                          style={{
                            color: COLORS.primary,
                            fontSize: 13,
                            fontWeight: "600",
                          }}
                        >
                          Resend verification email →
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              ) : null}

              {/* role selector  */}
              <View style={{ marginBottom: 24 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: COLORS.mutedForeground,
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  I am a
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    backgroundColor: COLORS.surfaceElevated,
                    borderRadius: 14,
                    padding: 4,
                    gap: 4,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                  }}
                >
                  {[
                    { key: "landlord", label: "Landlord", icon: "home-outline" },
                    { key: "tenant", label: "Tenant", icon: "person-outline" },
                  ].map(({ key, label, icon }) => (
                    <TouchableOpacity
                      key={key}
                      onPress={() => setRole(key)}
                      activeOpacity={0.8}
                      style={[
                        {
                          flex: 1,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          paddingVertical: 11,
                          borderRadius: 10,
                          gap: 6,
                        },
                        role === key
                          ? {
                              backgroundColor: COLORS.primary,
                              shadowColor: COLORS.primary,
                              shadowOffset: { width: 0, height: 4 },
                              shadowOpacity: 0.4,
                              shadowRadius: 8,
                              elevation: 3,
                            }
                          : {},
                      ]}
                    >
                      <Ionicons
                        name={icon}
                        size={16}
                        color={role === key ? "#fff" : COLORS.mutedForeground}
                      />
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: role === key ? "700" : "500",
                          color: role === key ? "#fff" : COLORS.mutedForeground,
                          letterSpacing: 0.2,
                        }}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* form  */}
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
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  textContentType="emailAddress"
                />

                <AuthInput
                  ref={passwordRef}
                  label="Password"
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    if (error) setError("");
                  }}
                  placeholder="Enter your password"
                  isPassword
                  showPassword={showPassword}
                  onTogglePassword={() => setShowPassword((s) => !s)}
                  leftIcon="lock-closed-outline"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  onFocus={() => scrollToInput(passwordRef, 160)}
                  textContentType="password"
                />

                <TouchableOpacity
                  onPress={() => router.push("/forgot-password")}
                  style={{ alignSelf: "flex-end", marginTop: -4 }}
                >
                  <Text
                    style={{
                      color: COLORS.primary,
                      fontSize: 13,
                      fontWeight: "600",
                    }}
                  >
                    Forgot password?
                  </Text>
                </TouchableOpacity>

                {/* Sign In Button */}
                <TouchableOpacity
                  onPress={handleLogin}
                  disabled={loading}
                  activeOpacity={0.85}
                  style={{
                    backgroundColor: loading ? "rgba(47,123,255,0.45)" : COLORS.primary,
                    borderRadius: 14,
                    paddingVertical: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 4,
                    shadowColor: COLORS.primary,
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: loading ? 0 : 0.45,
                    shadowRadius: 14,
                    elevation: loading ? 0 : 6,
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
                        Signing in…
                      </Text>
                    </>
                  ) : (
                    <Text
                      style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}
                    >
                      Sign in
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Divider */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: 8,
                    gap: 12,
                  }}
                >
                  <View
                    style={{ flex: 1, height: 1, backgroundColor: COLORS.border }}
                  />
                  <Text
                    style={{ fontSize: 12, color: COLORS.mutedForeground }}
                  >
                    New to Rentivo?
                  </Text>
                  <View
                    style={{ flex: 1, height: 1, backgroundColor: COLORS.border }}
                  />
                </View>

                <TouchableOpacity
                  onPress={() => router.push("/register")}
                  activeOpacity={0.8}
                  style={{
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    backgroundColor: COLORS.surfaceElevated,
                    borderRadius: 14,
                    paddingVertical: 15,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: COLORS.foreground,
                      fontSize: 15,
                      fontWeight: "600",
                      letterSpacing: 0.2,
                    }}
                  >
                    Create an account
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardContainer>
    </SafeAreaView>
  );
}
