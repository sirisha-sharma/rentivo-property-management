import React from "react";
import { View, Text, TouchableOpacity, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS } from "../constants/theme";

/**
 * Shared top navigation bar used by all inner screens.
 * Handles safe area (top/left/right only — no bottom inset).
 *
 * Props:
 *  title       — screen title string
 *  showBack    — show back chevron (defaults false)
 *  onBack      — custom back handler (defaults to router.back)
 *  rightIcon   — Ionicons name for right action
 *  onRightPress — handler for right action
 */
export const TopBar = ({ title, showBack, onBack, rightIcon, onRightPress }) => {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ backgroundColor: COLORS.background }}
    >
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
          backgroundColor: COLORS.background,
          minHeight: 52,
        }}
      >
        {/* Left: back button + title */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
          {showBack && (
            <TouchableOpacity
              onPress={handleBack}
              activeOpacity={0.7}
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                backgroundColor: COLORS.muted,
                alignItems: "center",
                justifyContent: "center",
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back" size={18} color={COLORS.foreground} />
            </TouchableOpacity>
          )}
          <Text
            style={{
              fontSize: 17,
              fontWeight: "700",
              color: COLORS.foreground,
              letterSpacing: -0.2,
              flexShrink: 1,
            }}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>

        {/* Right action */}
        {rightIcon && (
          <TouchableOpacity
            onPress={onRightPress}
            activeOpacity={0.7}
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              backgroundColor: "#EFF6FF",
              alignItems: "center",
              justifyContent: "center",
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name={rightIcon} size={18} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};
