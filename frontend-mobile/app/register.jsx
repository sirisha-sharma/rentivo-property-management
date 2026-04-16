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
import ExpoCheckbox from "expo-checkbox";
import axios from "axios";
import { API_BASE_URL } from "../constants/config";
import { COLORS } from "../constants/theme";
import AuthInput from "../components/AuthInput";

// Returns 0-4 strength score
function getPasswordStrength(password) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

const STRENGTH_LABELS = ["", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLORS = ["", "#EF4444", "#F59E0B", "#3B82F6", "#10B981"];

function PasswordStrengthBar({ password }) {
  const strength = getPasswordStrength(password);
  if (!password) return null;

  return (
    <View style={{ gap: 6, marginTop: 2 }}>
      <View style={{ flexDirection: "row", gap: 4 }}>
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              backgroundColor:
                i <= strength ? STRENGTH_COLORS[strength] : COLORS.border,
            }}
          />
        ))}
      </View>
      <Text
        style={{
          fontSize: 12,
          color: STRENGTH_COLORS[strength],
          fontWeight: "500",
        }}
      >
        {STRENGTH_LABELS[strength]}
      </Text>
    </View>
  );
}

export default function RegisterScreen() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [role, setRole] = useState("tenant");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const { height } = useWindowDimensions();
  const scrollViewRef = useRef(null);
  const KeyboardContainer = Platform.OS === "ios" ? KeyboardAvoidingView : View;
  const keyboardContainerProps =
    Platform.OS === "ios"
      ? {
          behavior: "padding",
          keyboardVerticalOffset: 0,
        }
      : {};
  const isCompactAndroid = Platform.OS === "android" && height < 780;
  const heroSize = isCompactAndroid ? 60 : 68;
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

  // Refs for input chaining
  const emailRef = useRef(null);
  const phoneRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim())
      newErrors.fullName = "Full name is required";

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!formData.phone) {
      newErrors.phone = "Phone number is required";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords don't match";
    }

    if (!agreedToTerms) {
      newErrors.terms = "You must agree to the terms to continue";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      await axios.post(`${API_BASE_URL}/auth/register`, {
        name: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        password: formData.password,
        role,
      });

      router.replace(
        `/verify-email?email=${encodeURIComponent(formData.email.trim().toLowerCase())}`
      );
    } catch (error) {
      const message =
        error.response?.data?.message || "Registration failed. Please try again.";
      setErrors((prev) => ({ ...prev, _api: message }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <KeyboardContainer style={{ flex: 1 }} {...keyboardContainerProps}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: Platform.OS === "ios" ? 32 : isCompactAndroid ? 22 : 34,
            paddingBottom: Platform.OS === "android" ? 172 : 48,
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
            {/* ── Brand / Hero ── */}
            <View
              style={{
                alignItems: "center",
                marginBottom: isCompactAndroid ? 24 : 32,
              }}
            >
              <LinearGradient
                colors={["#3B82F6", "#1D4ED8"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: heroSize,
                  height: heroSize,
                  borderRadius: isCompactAndroid ? 16 : 18,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 14,
                  shadowColor: "#2563EB",
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.3,
                  shadowRadius: 14,
                  elevation: 8,
                }}
              >
                <Ionicons
                  name="home"
                  size={isCompactAndroid ? 28 : 32}
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
                  marginBottom: 6,
                }}
              >
                Rentivo
              </Text>
              <Text
                style={{
                  fontSize: isCompactAndroid ? 22 : 24,
                  fontWeight: "700",
                  color: COLORS.foreground,
                  marginBottom: 4,
                  letterSpacing: -0.3,
                }}
              >
                Create your account
              </Text>
              <Text style={{ fontSize: 15, color: COLORS.mutedForeground }}>
                Get started, it takes less than a minute
              </Text>
            </View>

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
              {/* ── API Error Banner ── */}
              {errors._api ? (
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
                    {errors._api}
                  </Text>
                </View>
              ) : null}

              {/* ── Role Selector ── */}
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
                    backgroundColor: COLORS.muted,
                    borderRadius: 14,
                    padding: 4,
                    gap: 4,
                  }}
                >
                  {[
                    { key: "tenant", label: "Tenant", icon: "person-outline" },
                    { key: "landlord", label: "Landlord", icon: "home-outline" },
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
                              backgroundColor: COLORS.card,
                              shadowColor: "#000",
                              shadowOffset: { width: 0, height: 1 },
                              shadowOpacity: 0.08,
                              shadowRadius: 4,
                              elevation: 2,
                            }
                          : {},
                      ]}
                    >
                      <Ionicons
                        name={icon}
                        size={16}
                        color={
                          role === key ? COLORS.primary : COLORS.mutedForeground
                        }
                      />
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: role === key ? "600" : "500",
                          color:
                            role === key
                              ? COLORS.foreground
                              : COLORS.mutedForeground,
                        }}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* ── Form Fields ── */}
              <View style={{ gap: 16 }}>
                <AuthInput
                  label="Full Name"
                  value={formData.fullName}
                  onChangeText={(t) => updateField("fullName", t)}
                  placeholder="John Doe"
                  leftIcon="person-outline"
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                  textContentType="name"
                  error={errors.fullName}
                />

                <AuthInput
                  ref={emailRef}
                  label="Email"
                  value={formData.email}
                  onChangeText={(t) => updateField("email", t)}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  leftIcon="mail-outline"
                  returnKeyType="next"
                  onSubmitEditing={() => phoneRef.current?.focus()}
                  textContentType="emailAddress"
                  error={errors.email}
                />

                <AuthInput
                  ref={phoneRef}
                  label="Phone Number"
                  value={formData.phone}
                  onChangeText={(t) => updateField("phone", t)}
                  placeholder="+977 98XXXXXXXX"
                  keyboardType="phone-pad"
                  leftIcon="call-outline"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  textContentType="telephoneNumber"
                  error={errors.phone}
                />

                {/* Password with strength bar */}
                <View style={{ gap: 6 }}>
                  <AuthInput
                    ref={passwordRef}
                    label="Password"
                    value={formData.password}
                    onChangeText={(t) => updateField("password", t)}
                    placeholder="Min. 8 characters"
                    isPassword
                    showPassword={showPassword}
                    onTogglePassword={() => setShowPassword((s) => !s)}
                    leftIcon="lock-closed-outline"
                    returnKeyType="next"
                    onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                    onFocus={() => scrollToInput(passwordRef, 150)}
                    textContentType="newPassword"
                    error={errors.password}
                  />
                  <PasswordStrengthBar password={formData.password} />
                </View>

                <AuthInput
                  ref={confirmPasswordRef}
                  label="Confirm Password"
                  value={formData.confirmPassword}
                  onChangeText={(t) => updateField("confirmPassword", t)}
                  placeholder="Re-enter your password"
                  isPassword
                  showPassword={showConfirmPassword}
                  onTogglePassword={() => setShowConfirmPassword((s) => !s)}
                  leftIcon="lock-closed-outline"
                  returnKeyType="done"
                  onSubmitEditing={handleRegister}
                  onFocus={() => scrollToInput(confirmPasswordRef, 180)}
                  textContentType="newPassword"
                  error={errors.confirmPassword}
                />

                {/* Terms */}
                <View>
                  <TouchableOpacity
                    onPress={() => {
                      setAgreedToTerms((v) => !v);
                      if (errors.terms)
                        setErrors((prev) => ({ ...prev, terms: "" }));
                    }}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                      gap: 10,
                    }}
                  >
                    <ExpoCheckbox
                      value={agreedToTerms}
                      onValueChange={(v) => {
                        setAgreedToTerms(v);
                        if (errors.terms)
                          setErrors((prev) => ({ ...prev, terms: "" }));
                      }}
                      color={agreedToTerms ? COLORS.primary : undefined}
                      style={{ marginTop: 2 }}
                    />
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 14,
                        color: COLORS.mutedForeground,
                        lineHeight: 21,
                      }}
                    >
                      I agree to the{" "}
                      <Text style={{ color: COLORS.primary, fontWeight: "600" }}>
                        Terms of Service
                      </Text>{" "}
                      and{" "}
                      <Text style={{ color: COLORS.primary, fontWeight: "600" }}>
                        Privacy Policy
                      </Text>
                    </Text>
                  </TouchableOpacity>

                  {errors.terms ? (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        marginTop: 6,
                      }}
                    >
                      <Ionicons
                        name="alert-circle"
                        size={13}
                        color={COLORS.destructive}
                      />
                      <Text
                        style={{ fontSize: 12, color: COLORS.destructive }}
                      >
                        {errors.terms}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Create Account Button */}
                <TouchableOpacity
                  onPress={handleRegister}
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
                        Creating account…
                      </Text>
                    </>
                  ) : (
                    <Text
                      style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}
                    >
                      Create account
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Sign in link */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    marginTop: 4,
                    paddingBottom: 8,
                  }}
                >
                  <Text
                    style={{ fontSize: 14, color: COLORS.mutedForeground }}
                  >
                    Already have an account?{" "}
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
