import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
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
import Checkbox from "expo-checkbox";

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
      <View className="flex-1 items-center justify-center p-6 bg-background">
        <View className="w-20 h-20 rounded-full bg-green-100 items-center justify-center mb-4">
          <Ionicons name="checkmark-circle" size={40} color={COLORS.success} />
        </View>
        <Text className="text-xl font-bold text-foreground mb-2">Account created!</Text>
        <Text className="text-mutedForeground text-center">
          Welcome to Rentivo. Redirecting you to login...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="flex-grow p-6 justify-center">
          {/* Header */}
          <View className="items-center mb-6">
            <View className="w-14 h-14 rounded-2xl bg-primary items-center justify-center mb-3 shadow-sm shadow-primary">
              <Ionicons name="home" size={28} color={COLORS.primaryForeground} />
            </View>
            <Text className="text-2xl font-bold text-foreground">Create account</Text>
            <Text className="text-sm text-mutedForeground mt-1">Get started with Rentivo today</Text>
          </View>

          {/* Form */}
          <View className="gap-4">
            {/* Role Selector */}
            <View className="gap-1.5">
              <Text className="text-sm font-medium text-foreground mb-0.5">I am a</Text>
              <View className="flex-row bg-muted p-1 rounded-xl gap-1">
                <TouchableOpacity
                  className={`flex-1 py-2.5 items-center rounded-lg ${role === "landlord" ? "bg-card shadow-sm" : ""
                    }`}
                  onPress={() => setRole("landlord")}
                >
                  <Text
                    className={`text-sm font-medium ${role === "landlord" ? "text-foreground font-semibold" : "text-mutedForeground"
                      }`}
                  >
                    Landlord
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`flex-1 py-2.5 items-center rounded-lg ${role === "tenant" ? "bg-card shadow-sm" : ""
                    }`}
                  onPress={() => setRole("tenant")}
                >
                  <Text
                    className={`text-sm font-medium ${role === "tenant" ? "text-foreground font-semibold" : "text-mutedForeground"
                      }`}
                  >
                    Tenant
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Inputs */}
            <View className="gap-1.5">
              <Text className="text-sm font-medium text-foreground mb-0.5">Full Name</Text>
              <TextInput
                className={`h-11 border rounded-lg px-4 text-base bg-input text-foreground ${errors.fullName ? "border-destructive" : "border-border"
                  }`}
                placeholder="John Doe"
                value={formData.fullName}
                onChangeText={(text) => updateField("fullName", text)}
                placeholderTextColor={COLORS.mutedForeground}
              />
              {errors.fullName && (
                <View className="flex-row items-center gap-1 mt-1">
                  <Ionicons name="alert-circle" size={12} color={COLORS.destructive} />
                  <Text className="text-xs text-destructive">{errors.fullName}</Text>
                </View>
              )}
            </View>

            <View className="gap-1.5">
              <Text className="text-sm font-medium text-foreground mb-0.5">Email</Text>
              <TextInput
                className={`h-11 border rounded-lg px-4 text-base bg-input text-foreground ${errors.email ? "border-destructive" : "border-border"
                  }`}
                placeholder="you@example.com"
                value={formData.email}
                onChangeText={(text) => updateField("email", text)}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={COLORS.mutedForeground}
              />
              {errors.email && (
                <View className="flex-row items-center gap-1 mt-1">
                  <Ionicons name="alert-circle" size={12} color={COLORS.destructive} />
                  <Text className="text-xs text-destructive">{errors.email}</Text>
                </View>
              )}
            </View>

            <View className="gap-1.5">
              <Text className="text-sm font-medium text-foreground mb-0.5">Phone Number</Text>
              <TextInput
                className={`h-11 border rounded-lg px-4 text-base bg-input text-foreground ${errors.phone ? "border-destructive" : "border-border"
                  }`}
                placeholder="+977 98XXXXXXXX"
                value={formData.phone}
                onChangeText={(text) => updateField("phone", text)}
                keyboardType="phone-pad"
                placeholderTextColor={COLORS.mutedForeground}
              />
              {errors.phone && (
                <View className="flex-row items-center gap-1 mt-1">
                  <Ionicons name="alert-circle" size={12} color={COLORS.destructive} />
                  <Text className="text-xs text-destructive">{errors.phone}</Text>
                </View>
              )}
            </View>

            <View className="gap-1.5">
              <Text className="text-sm font-medium text-foreground mb-0.5">Password</Text>
              <View className={`flex-row items-center border rounded-lg bg-input ${errors.password ? "border-destructive" : "border-border"
                }`}>
                <TextInput
                  className="flex-1 h-11 px-4 text-base text-foreground"
                  placeholder="Min. 8 characters"
                  value={formData.password}
                  onChangeText={(text) => updateField("password", text)}
                  secureTextEntry={!showPassword}
                  placeholderTextColor={COLORS.mutedForeground}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  className="p-2.5"
                >
                  <Ionicons
                    name={showPassword ? "eye-off" : "eye"}
                    size={20}
                    color={COLORS.mutedForeground}
                  />
                </TouchableOpacity>
              </View>
              {errors.password && (
                <View className="flex-row items-center gap-1 mt-1">
                  <Ionicons name="alert-circle" size={12} color={COLORS.destructive} />
                  <Text className="text-xs text-destructive">{errors.password}</Text>
                </View>
              )}
            </View>

            <View className="gap-1.5">
              <Text className="text-sm font-medium text-foreground mb-0.5">Confirm Password</Text>
              <View className={`flex-row items-center border rounded-lg bg-input ${errors.confirmPassword ? "border-destructive" : "border-border"
                }`}>
                <TextInput
                  className="flex-1 h-11 px-4 text-base text-foreground"
                  placeholder="Re-enter your password"
                  value={formData.confirmPassword}
                  onChangeText={(text) => updateField("confirmPassword", text)}
                  secureTextEntry={!showConfirmPassword}
                  placeholderTextColor={COLORS.mutedForeground}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="p-2.5"
                >
                  <Ionicons
                    name={showConfirmPassword ? "eye-off" : "eye"}
                    size={20}
                    color={COLORS.mutedForeground}
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && (
                <View className="flex-row items-center gap-1 mt-1">
                  <Ionicons name="alert-circle" size={12} color={COLORS.destructive} />
                  <Text className="text-xs text-destructive">{errors.confirmPassword}</Text>
                </View>
              )}
            </View>

            {/* Terms Checkbox */}
            <View className="flex-row items-start gap-2 mt-1">
              <Checkbox
                value={agreedToTerms}
                onValueChange={setAgreedToTerms}
                color={agreedToTerms ? COLORS.primary : undefined}
                className="mt-0.5"
              />
              <View className="flex-1">
                <Text className="text-sm text-mutedForeground leading-5">
                  I agree to the <Text className="text-primary font-medium">Terms of Service</Text> and{" "}
                  <Text className="text-primary font-medium">Privacy Policy</Text>
                </Text>
              </View>
            </View>
            {errors.terms && (
              <View className="flex-row items-center gap-1 mt-1">
                <Ionicons name="alert-circle" size={12} color={COLORS.destructive} />
                <Text className="text-xs text-destructive">{errors.terms}</Text>
              </View>
            )}

            <TouchableOpacity
              className="bg-primary h-11 rounded-lg items-center justify-center mt-2"
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator size="small" color="#fff" />
                  <Text className="text-white text-base font-semibold">Creating account...</Text>
                </View>
              ) : (
                <Text className="text-white text-base font-semibold">Create account</Text>
              )}
            </TouchableOpacity>

            <View className="flex-row justify-center mt-4 mb-5">
              <Text className="text-mutedForeground text-sm">Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push("/")}>
                <Text className="text-primary font-medium">Sign in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
