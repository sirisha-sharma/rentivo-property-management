import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { API_BASE_URL } from "../constants/config";
import { COLORS } from "../constants/theme";
import Checkbox from "expo-checkbox"; // Ensure this is installed, otherwise use simple View/Icon toggle

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
  const [showSuccess, setShowSuccess] = useState(false);

  const router = useRouter();

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) newErrors.fullName = "Full name is required";
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }
    if (!formData.phone) newErrors.phone = "Phone number is required";
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords don't match";
    }
    if (!agreedToTerms) {
      newErrors.terms = "You must agree to the terms";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      await axios.post(`${API_BASE_URL}/auth/register`, {
        name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: role,
      });

      setShowSuccess(true);
      setTimeout(() => {
        router.replace("/");
      }, 1500);
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (showSuccess) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={40} color={COLORS.success} />
        </View>
        <Text style={styles.successTitle}>Account created!</Text>
        <Text style={styles.successText}>
          Welcome to Rentivo. Redirecting you to login...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="home" size={28} color={COLORS.primaryForeground} />
            </View>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>Get started with Rentivo today</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Role Selector */}
            <View style={styles.section}>
              <Text style={styles.label}>I am a</Text>
              <View style={styles.roleSelector}>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    role === "landlord" && styles.roleButtonActive,
                  ]}
                  onPress={() => setRole("landlord")}
                >
                  <Text
                    style={[
                      styles.roleText,
                      role === "landlord" && styles.roleTextActive,
                    ]}
                  >
                    Landlord
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    role === "tenant" && styles.roleButtonActive,
                  ]}
                  onPress={() => setRole("tenant")}
                >
                  <Text
                    style={[
                      styles.roleText,
                      role === "tenant" && styles.roleTextActive,
                    ]}
                  >
                    Tenant
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Inputs */}
            <View style={styles.section}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={[styles.input, errors.fullName && styles.inputError]}
                placeholder="John Doe"
                value={formData.fullName}
                onChangeText={(text) => updateField("fullName", text)}
                placeholderTextColor={COLORS.mutedForeground}
              />
              {errors.fullName && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle" size={12} color={COLORS.destructive} />
                  <Text style={styles.errorText}>{errors.fullName}</Text>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="you@example.com"
                value={formData.email}
                onChangeText={(text) => updateField("email", text)}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={COLORS.mutedForeground}
              />
              {errors.email && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle" size={12} color={COLORS.destructive} />
                  <Text style={styles.errorText}>{errors.email}</Text>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={[styles.input, errors.phone && styles.inputError]}
                placeholder="+977 98XXXXXXXX"
                value={formData.phone}
                onChangeText={(text) => updateField("phone", text)}
                keyboardType="phone-pad"
                placeholderTextColor={COLORS.mutedForeground}
              />
              {errors.phone && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle" size={12} color={COLORS.destructive} />
                  <Text style={styles.errorText}>{errors.phone}</Text>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.passwordContainer, errors.password && styles.inputError]}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Min. 8 characters"
                  value={formData.password}
                  onChangeText={(text) => updateField("password", text)}
                  secureTextEntry={!showPassword}
                  placeholderTextColor={COLORS.mutedForeground}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showPassword ? "eye-off" : "eye"}
                    size={20}
                    color={COLORS.mutedForeground}
                  />
                </TouchableOpacity>
              </View>
              {errors.password && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle" size={12} color={COLORS.destructive} />
                  <Text style={styles.errorText}>{errors.password}</Text>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={[styles.passwordContainer, errors.confirmPassword && styles.inputError]}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Re-enter your password"
                  value={formData.confirmPassword}
                  onChangeText={(text) => updateField("confirmPassword", text)}
                  secureTextEntry={!showConfirmPassword}
                  placeholderTextColor={COLORS.mutedForeground}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showConfirmPassword ? "eye-off" : "eye"}
                    size={20}
                    color={COLORS.mutedForeground}
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle" size={12} color={COLORS.destructive} />
                  <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                </View>
              )}
            </View>

            {/* Terms Checkbox */}
            <View style={styles.termsContainer}>
              <Checkbox
                value={agreedToTerms}
                onValueChange={setAgreedToTerms}
                color={agreedToTerms ? COLORS.primary : undefined}
                style={styles.checkbox}
              />
              <View style={styles.termsTextContainer}>
                <Text style={styles.termsText}>
                  I agree to the <Text style={styles.linkText}>Terms of Service</Text> and{" "}
                  <Text style={styles.linkText}>Privacy Policy</Text>
                </Text>
              </View>
            </View>
            {errors.terms && (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={12} color={COLORS.destructive} />
                <Text style={styles.errorText}>{errors.terms}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.buttonText}>Creating account...</Text>
                </View>
              ) : (
                <Text style={styles.buttonText}>Create account</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push("/")}>
                <Text style={styles.linkText}>Sign in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
  },
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: COLORS.background,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#DCFCE7", // success/20
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.foreground,
    marginBottom: 8,
  },
  successText: {
    color: COLORS.mutedForeground,
    textAlign: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.foreground,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.mutedForeground,
    marginTop: 4,
  },
  form: {
    gap: 16,
  },
  section: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.foreground,
    marginBottom: 2,
  },
  roleSelector: {
    flexDirection: "row",
    backgroundColor: COLORS.muted,
    padding: 4,
    borderRadius: 12,
    gap: 4,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  roleButtonActive: {
    backgroundColor: COLORS.card,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  roleText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.mutedForeground,
  },
  roleTextActive: {
    color: COLORS.foreground,
    fontWeight: "600",
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: COLORS.input,
    color: COLORS.foreground,
  },
  inputError: {
    borderColor: COLORS.destructive,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.input,
  },
  passwordInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.foreground,
  },
  eyeIcon: {
    padding: 10,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.destructive,
  },
  termsContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 4,
  },
  checkbox: {
    marginTop: 2,
  },
  termsTextContainer: {
    flex: 1,
  },
  termsText: {
    fontSize: 14,
    color: COLORS.mutedForeground,
    lineHeight: 20,
  },
  linkText: {
    color: COLORS.primary,
    fontWeight: "500",
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
    marginBottom: 20,
  },
  footerText: {
    color: COLORS.mutedForeground,
    fontSize: 14,
  },
});
