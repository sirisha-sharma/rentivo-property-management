import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";

/**
 * Consistent empty state for list screens.
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
      {/* Icon circle */}
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: COLORS.muted,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
        }}
      >
        <Ionicons name={icon} size={34} color={COLORS.border} />
      </View>

      {/* Title */}
      {title ? (
        <Text
          style={{
            fontSize: 17,
            fontWeight: "700",
            color: COLORS.foreground,
            textAlign: "center",
            marginBottom: 8,
            letterSpacing: -0.2,
          }}
        >
          {title}
        </Text>
      ) : null}

      {/* Subtitle */}
      {subtitle ? (
        <Text
          style={{
            fontSize: 14,
            color: COLORS.mutedForeground,
            textAlign: "center",
            lineHeight: 20,
          }}
        >
          {subtitle}
        </Text>
      ) : null}

      {/* Optional CTA */}
      {action ? (
        <TouchableOpacity
          onPress={action.onPress}
          activeOpacity={0.85}
          style={{
            marginTop: 20,
            backgroundColor: COLORS.primary,
            borderRadius: 12,
            paddingHorizontal: 20,
            paddingVertical: 11,
          }}
        >
          <Text
            style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}
          >
            {action.label}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
