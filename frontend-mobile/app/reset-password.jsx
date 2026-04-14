import React, { useState } from "react";
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
import { API_BASE_URL } from "../constants/config";
import { COLORS } from "../constants/theme";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");

  const validate = () => {
    const newErrors = {};
    if (!token.trim()) newErrors.token = "Reset code is required";
    if (!newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters";
    }
    if (newPassword !== confirmPassword) {
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
      setApiError(err.response?.data?.message || "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center p-6">
          <View className="w-20 h-20 rounded-full bg-green-100 items-center justify-center mb-6">
            <Ionicons name="checkmark-circle" size={40} color="#16a34a" />
          </View>
          <Text className="text-2xl font-bold text-foreground mb-2 text-center">
            Password reset!
          </Text>
          <Text className="text-mutedForeground text-center text-base mb-8">
            Your password has been updated. You can now sign in with your new password.
          </Text>
          <TouchableOpacity
            className="w-full bg-primary h-12 rounded-lg items-center justify-center"
            onPress={() => router.replace("/")}
          >
            <Text className="text-white text-base font-semibold">Back to sign in</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="flex-grow p-6 justify-center">
          {/* Back button */}
          <TouchableOpacity className="mb-6" onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.foreground} />
          </TouchableOpacity>

          <View className="mb-8">
            <View className="w-14 h-14 rounded-2xl bg-primary items-center justify-center mb-4">
              <Ionicons name="key-outline" size={28} color={COLORS.primaryForeground} />
            </View>
            <Text className="text-2xl font-bold text-foreground mb-1">Reset password</Text>
            <Text className="text-mutedForeground text-base">
              Paste the reset code from your email and choose a new password.
            </Text>
          </View>

          {apiError ? (
            <View className="flex-row items-center bg-red-50 border border-red-200 rounded-lg p-3 mb-4 gap-2">
              <Ionicons name="alert-circle" size={16} color={COLORS.destructive} />
              <Text className="text-destructive text-sm flex-1">{apiError}</Text>
            </View>
          ) : null}

          <View className="gap-4">
            {/* Reset code */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">Reset code</Text>
              <TextInput
                className={`h-12 border rounded-lg px-4 text-base bg-input text-foreground font-mono ${
                  errors.token ? "border-destructive" : "border-border"
                }`}
                placeholder="Paste reset code from email"
                value={token}
                onChangeText={(text) => {
                  setToken(text);
                  setErrors((e) => ({ ...e, token: "" }));
                }}
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor={COLORS.mutedForeground}
              />
              {errors.token ? (
                <View className="flex-row items-center gap-1">
                  <Ionicons name="alert-circle" size={12} color={COLORS.destructive} />
                  <Text className="text-xs text-destructive">{errors.token}</Text>
                </View>
              ) : null}
            </View>

            {/* New password */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">New password</Text>
              <View
                className={`flex-row items-center border rounded-lg bg-input ${
                  errors.newPassword ? "border-destructive" : "border-border"
                }`}
              >
                <TextInput
                  className="flex-1 h-12 px-4 text-base text-foreground"
                  placeholder="Min. 8 characters"
                  value={newPassword}
                  onChangeText={(text) => {
                    setNewPassword(text);
                    setErrors((e) => ({ ...e, newPassword: "" }));
                  }}
                  secureTextEntry={!showPassword}
                  placeholderTextColor={COLORS.mutedForeground}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="p-3">
                  <Ionicons
                    name={showPassword ? "eye-off" : "eye"}
                    size={20}
                    color={COLORS.mutedForeground}
                  />
                </TouchableOpacity>
              </View>
              {errors.newPassword ? (
                <View className="flex-row items-center gap-1">
                  <Ionicons name="alert-circle" size={12} color={COLORS.destructive} />
                  <Text className="text-xs text-destructive">{errors.newPassword}</Text>
                </View>
              ) : null}
            </View>

            {/* Confirm password */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">Confirm new password</Text>
              <View
                className={`flex-row items-center border rounded-lg bg-input ${
                  errors.confirmPassword ? "border-destructive" : "border-border"
                }`}
              >
                <TextInput
                  className="flex-1 h-12 px-4 text-base text-foreground"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    setErrors((e) => ({ ...e, confirmPassword: "" }));
                  }}
                  secureTextEntry={!showConfirmPassword}
                  placeholderTextColor={COLORS.mutedForeground}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="p-3"
                >
                  <Ionicons
                    name={showConfirmPassword ? "eye-off" : "eye"}
                    size={20}
                    color={COLORS.mutedForeground}
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword ? (
                <View className="flex-row items-center gap-1">
                  <Ionicons name="alert-circle" size={12} color={COLORS.destructive} />
                  <Text className="text-xs text-destructive">{errors.confirmPassword}</Text>
                </View>
              ) : null}
            </View>

            <TouchableOpacity
              className="bg-primary h-12 rounded-lg items-center justify-center mt-2"
              onPress={handleReset}
              disabled={loading}
            >
              {loading ? (
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator size="small" color="#fff" />
                  <Text className="text-white text-base font-semibold">Resetting...</Text>
                </View>
              ) : (
                <Text className="text-white text-base font-semibold">Reset password</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
