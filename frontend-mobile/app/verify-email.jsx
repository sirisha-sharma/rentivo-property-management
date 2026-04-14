import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { API_BASE_URL } from "../constants/config";
import { COLORS } from "../constants/theme";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState("");

  const handleResend = async () => {
    setLoading(true);
    setError("");
    setResent(false);
    try {
      await axios.post(`${API_BASE_URL}/auth/resend-verification`, { email });
      setResent(true);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center p-6">
        <View className="w-20 h-20 rounded-full bg-blue-100 items-center justify-center mb-6">
          <Ionicons name="mail-outline" size={40} color={COLORS.primary} />
        </View>

        <Text className="text-2xl font-bold text-foreground mb-2 text-center">
          Check your email
        </Text>
        <Text className="text-mutedForeground text-center text-base mb-2">
          We sent a verification link to
        </Text>
        <Text className="text-foreground font-semibold text-center text-base mb-6">
          {email}
        </Text>
        <Text className="text-mutedForeground text-center text-sm mb-8">
          Click the link in the email to activate your account. The link expires in 24 hours.
        </Text>

        {resent && (
          <View className="flex-row items-center bg-green-50 border border-green-200 rounded-lg p-3 mb-4 gap-2 w-full">
            <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
            <Text className="text-green-700 text-sm">Verification email resent.</Text>
          </View>
        )}

        {error ? (
          <View className="flex-row items-center bg-red-50 border border-red-200 rounded-lg p-3 mb-4 gap-2 w-full">
            <Ionicons name="alert-circle" size={16} color={COLORS.destructive} />
            <Text className="text-destructive text-sm">{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          className="w-full bg-primary h-12 rounded-lg items-center justify-center mb-4"
          onPress={handleResend}
          disabled={loading}
        >
          {loading ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator size="small" color="#fff" />
              <Text className="text-white text-base font-semibold">Sending...</Text>
            </View>
          ) : (
            <Text className="text-white text-base font-semibold">Resend verification email</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace("/")}>
          <Text className="text-primary font-medium text-sm">Back to sign in</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
