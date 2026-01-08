import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { API_BASE_URL } from "../constants/config";
import { COLORS } from "../constants/theme";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState("landlord"); // Default selected role for UI state
  const [error, setError] = useState("");

  const { login } = useContext(AuthContext);
  const router = useRouter();

  const validateForm = () => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email");
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
        email,
        password,
      });

      await login(response.data);
      router.replace("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Logo and Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="home" size={32} color={COLORS.primaryForeground} />
            </View>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to continue to Rentivo</Text>
          </View>

          {/* Error Banner */}
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color={COLORS.destructive} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Role Selector */}
          <View style={styles.roleContainer}>
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

          {/* Form Fields */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setError("");
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor={COLORS.mutedForeground}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setError("");
                  }}
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
            </View>

            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.linkText}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.buttonText}>Signing in...</Text>
                </View>
              ) : (
                <Text style={styles.buttonText}>Sign in</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push("/register")}>
                <Text style={styles.linkText}>Create account</Text>
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
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.mutedForeground,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: COLORS.destructive,
    fontSize: 14,
  },
  roleContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: COLORS.foreground,
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
    paddingVertical: 12,
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
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: COLORS.input,
    color: COLORS.foreground,
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
    height: 48,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.foreground,
  },
  eyeIcon: {
    padding: 12,
  },
  forgotPassword: {
    alignSelf: "flex-end",
  },
  linkText: {
    color: COLORS.primary,
    fontWeight: "600",
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    height: 48,
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
    marginTop: 24,
  },
  footerText: {
    color: COLORS.mutedForeground,
    fontSize: 14,
  },
});
