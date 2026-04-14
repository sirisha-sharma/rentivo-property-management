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

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSend = async () => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
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
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center p-6">
          <View className="w-20 h-20 rounded-full bg-blue-100 items-center justify-center mb-6">
            <Ionicons name="mail-outline" size={40} color={COLORS.primary} />
          </View>
          <Text className="text-2xl font-bold text-foreground mb-2 text-center">
            Check your email
          </Text>
          <Text className="text-mutedForeground text-center text-base mb-8">
            If <Text className="font-semibold text-foreground">{email}</Text> is registered, we've
            sent a reset code. Copy the code from the email and paste it on the next screen.
          </Text>
          <TouchableOpacity
            className="w-full bg-primary h-12 rounded-lg items-center justify-center mb-4"
            onPress={() => router.push("/reset-password")}
          >
            <Text className="text-white text-base font-semibold">Enter reset code</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.replace("/")}>
            <Text className="text-primary font-medium text-sm">Back to sign in</Text>
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
              <Ionicons name="lock-closed-outline" size={28} color={COLORS.primaryForeground} />
            </View>
            <Text className="text-2xl font-bold text-foreground mb-1">Forgot password?</Text>
            <Text className="text-mutedForeground text-base">
              Enter your email and we'll send you a reset code.
            </Text>
          </View>

          {error ? (
            <View className="flex-row items-center bg-red-50 border border-red-200 rounded-lg p-3 mb-4 gap-2">
              <Ionicons name="alert-circle" size={16} color={COLORS.destructive} />
              <Text className="text-destructive text-sm flex-1">{error}</Text>
            </View>
          ) : null}

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

            <TouchableOpacity
              className="bg-primary h-12 rounded-lg items-center justify-center mt-2"
              onPress={handleSend}
              disabled={loading}
            >
              {loading ? (
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator size="small" color="#fff" />
                  <Text className="text-white text-base font-semibold">Sending...</Text>
                </View>
              ) : (
                <Text className="text-white text-base font-semibold">Send reset code</Text>
              )}
            </TouchableOpacity>

            <View className="flex-row justify-center mt-4">
              <Text className="text-mutedForeground text-sm">Remember your password? </Text>
              <TouchableOpacity onPress={() => router.replace("/")}>
                <Text className="text-primary font-semibold text-sm">Sign in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
