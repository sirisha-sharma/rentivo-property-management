import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { API_BASE_URL } from "../constants/config";
import { COLORS } from "../constants/theme";

export default function Verify2FAScreen() {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const { login } = useContext(AuthContext);
  const router = useRouter();
  const { userId, email } = useLocalSearchParams();

  const inputRefs = useRef([]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleCodeChange = (value, index) => {
    const cleaned = value.replace(/[^0-9]/g, "").slice(-1);
    const newCode = [...code];
    newCode[index] = cleaned;
    setCode(newCode);
    setError("");
    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      setError("Please enter the full 6-digit code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/verify-2fa`, {
        userId,
        code: fullCode,
      });

      await login(response.data);
      router.replace(response.data.role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: 24,
            paddingVertical: 40,
          }}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ width: "100%", maxWidth: 460, alignSelf: "center" }}>
            {/* Back button */}
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginBottom: 32, flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Ionicons name="arrow-back" size={20} color={COLORS.mutedForeground} />
              <Text style={{ fontSize: 14, color: COLORS.mutedForeground }}>Back</Text>
            </TouchableOpacity>

            {/* Header */}
            <View style={{ alignItems: "center", marginBottom: 36 }}>
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                  shadowColor: COLORS.primary,
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.5,
                  shadowRadius: 18,
                  elevation: 10,
                }}
              >
                <Ionicons name="shield-checkmark" size={34} color="#fff" />
              </LinearGradient>

              <Text
                style={{
                  fontSize: 26,
                  fontWeight: "700",
                  color: COLORS.foreground,
                  marginBottom: 8,
                  letterSpacing: -0.3,
                }}
              >
                Verify Identity
              </Text>
              <Text
                style={{
                  fontSize: 15,
                  color: COLORS.mutedForeground,
                  textAlign: "center",
                  lineHeight: 22,
                }}
              >
                Enter the 6-digit code sent to{"\n"}
                <Text style={{ color: COLORS.primary, fontWeight: "600" }}>
                  {email || "your email"}
                </Text>
              </Text>
            </View>

            {/* Card */}
            <View
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 28,
                borderWidth: 1,
                borderColor: COLORS.border,
                padding: 24,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 18 },
                shadowOpacity: 0.35,
                shadowRadius: 28,
                elevation: 10,
              }}
            >
              {/* Error banner */}
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
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Ionicons name="alert-circle" size={18} color={COLORS.destructive} />
                  <Text style={{ color: COLORS.destructive, fontSize: 14, flex: 1 }}>
                    {error}
                  </Text>
                </View>
              ) : null}

              {/* OTP input boxes */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  gap: 8,
                  marginBottom: 28,
                }}
              >
                {code.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => (inputRefs.current[index] = ref)}
                    value={digit}
                    onChangeText={(val) => handleCodeChange(val, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={1}
                    style={{
                      flex: 1,
                      height: 56,
                      backgroundColor: COLORS.surfaceElevated,
                      borderWidth: 1.5,
                      borderColor: digit ? COLORS.primary : COLORS.border,
                      borderRadius: 14,
                      textAlign: "center",
                      fontSize: 22,
                      fontWeight: "700",
                      color: COLORS.foreground,
                    }}
                    selectionColor={COLORS.primary}
                  />
                ))}
              </View>

              {/* Verify button */}
              <TouchableOpacity
                onPress={handleVerify}
                disabled={loading}
                activeOpacity={0.85}
                style={{
                  backgroundColor: loading ? "rgba(47,123,255,0.45)" : COLORS.primary,
                  borderRadius: 14,
                  paddingVertical: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
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
                    <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
                      Verifying…
                    </Text>
                  </>
                ) : (
                  <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
                    Verify Code
                  </Text>
                )}
              </TouchableOpacity>

              <Text style={{ textAlign: "center", fontSize: 13, color: COLORS.mutedForeground }}>
                Code expires in 10 minutes
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
