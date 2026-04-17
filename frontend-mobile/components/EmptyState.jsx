import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";

/**
 * Consistent empty state for list screens (dark mode).
 *
 * Props:
 *  icon      — Ionicons name (default "file-tray-outline")
 *  title     — heading text
 *  subtitle  — supporting description
 *  action    — optional CTA button: { label: string, onPress: () => void }
 */
export function EmptyState({ icon = "file-tray-outline", title, subtitle, action }) {
  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 64,
        paddingHorizontal: 40,
        paddingBottom: 32,
      }}
    >
      <View
        style={{
          width: 84,
          height: 84,
          borderRadius: 28,
          backgroundColor: COLORS.surface,
          borderWidth: 1,
          borderColor: COLORS.border,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 22,
        }}
      >
        <View
          style={{
            width: 60,
            height: 60,
            borderRadius: 20,
            backgroundColor: COLORS.primarySoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={icon} size={28} color={COLORS.primary} />
        </View>
      </View>

      {title ? (
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: COLORS.foreground,
            textAlign: "center",
            marginBottom: 8,
            letterSpacing: -0.3,
          }}
        >
          {title}
        </Text>
      ) : null}

      {subtitle ? (
        <Text
          style={{
            fontSize: 14,
            color: COLORS.mutedForeground,
            textAlign: "center",
            lineHeight: 21,
          }}
        >
          {subtitle}
        </Text>
      ) : null}

      {action ? (
        <TouchableOpacity
          onPress={action.onPress}
          activeOpacity={0.85}
          style={{
            marginTop: 24,
            backgroundColor: COLORS.primary,
            borderRadius: 14,
            paddingHorizontal: 22,
            paddingVertical: 13,
            shadowColor: COLORS.primary,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35,
            shadowRadius: 14,
            elevation: 4,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700", letterSpacing: 0.2 }}>
            {action.label}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
