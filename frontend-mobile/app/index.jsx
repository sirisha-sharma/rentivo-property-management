import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
  const [role, setRole] = useState("landlord");
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
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="flex-grow p-6 justify-center">
          {/* Logo and Header */}
          <View className="items-center mb-8">
            <View className="w-16 h-16 rounded-2xl bg-primary items-center justify-center mb-4 shadow-sm shadow-primary">
              <Ionicons name="home" size={32} color={COLORS.primaryForeground} />
            </View>
            <Text className="text-2xl font-bold text-foreground mb-1">Welcome back</Text>
            <Text className="text-base text-mutedForeground">Sign in to continue to Rentivo</Text>
          </View>

          {/* Error Banner */}
          {error ? (
            <View className="flex-row items-center bg-red-50 border border-red-200 rounded-lg p-3 mb-4 gap-2">
              <Ionicons name="alert-circle" size={16} color={COLORS.destructive} />
              <Text className="text-destructive text-sm">{error}</Text>
            </View>
          ) : null}

          {/* Role Selector */}
          <View className="mb-6">
            <Text className="text-sm font-semibold mb-2 text-foreground">I am a</Text>
            <View className="flex-row bg-muted p-1 rounded-xl gap-1">
              <TouchableOpacity
                className="flex-1 py-3 items-center rounded-lg"
                style={role === "landlord" ? { backgroundColor: COLORS.card, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 } : {}}
                onPress={() => setRole("landlord")}
              >
                <Text
                  className={`text-sm font-medium ${role === "landlord" ? "text-foreground font-semibold" : "text-mutedForeground"}`}
                >
                  Landlord
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 py-3 items-center rounded-lg"
                style={role === "tenant" ? { backgroundColor: COLORS.card, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 } : {}}
                onPress={() => setRole("tenant")}
              >
                <Text
                  className={`text-sm font-medium ${role === "tenant" ? "text-foreground font-semibold" : "text-mutedForeground"}`}
                >
                  Tenant
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Form Fields */}
          <View className="gap-4">
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">Email</Text>
              <TextInput
                className="h-12 border border-border rounded-lg px-4 text-base bg-input text-foreground"
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

            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">Password</Text>
              <View className="flex-row items-center border border-border rounded-lg bg-input">
                <TextInput
                  className="flex-1 h-12 px-4 text-base text-foreground"
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
                  className="p-3"
                >
                  <Ionicons
                    name={showPassword ? "eye-off" : "eye"}
                    size={20}
                    color={COLORS.mutedForeground}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity className="self-end">
              <Text className="text-primary font-semibold text-sm">Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-primary h-12 rounded-lg items-center justify-center mt-2"
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator size="small" color="#fff" />
                  <Text className="text-white text-base font-semibold">Signing in...</Text>
                </View>
              ) : (
                <Text className="text-white text-base font-semibold">Sign in</Text>
              )}
            </TouchableOpacity>

            <View className="flex-row justify-center mt-6">
              <Text className="text-mutedForeground text-sm">Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push("/register")}>
                <Text className="text-primary font-semibold text-sm">Create account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
