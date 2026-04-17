import React from "react";
import { ScrollView, TouchableOpacity, Text } from "react-native";
import { COLORS } from "../constants/theme";

/**
 * Horizontal scrollable filter chip row for list screens (dark mode).
 *
 * Props:
 *  options   — array of { key: string, label: string }
 *  selected  — currently selected key string
 *  onSelect  — (key: string) => void
 *  style     — optional outer ScrollView style
 *  contentContainerStyle — optional inner row style
 */
export function FilterChips({ options, selected, onSelect, style, contentContainerStyle }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[{ flexGrow: 0 }, style]}
      contentContainerStyle={[
        {
          paddingHorizontal: 16,
          paddingVertical: 4,
          gap: 8,
          flexDirection: "row",
          alignItems: "center",
        },
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="never"
      overScrollMode="never"
    >
      {options.map(({ key, label }) => {
        const active = selected === key;
        return (
          <TouchableOpacity
            key={key}
            onPress={() => onSelect(key)}
            activeOpacity={0.75}
            style={{
              paddingHorizontal: 16,
              minHeight: 36,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: active ? COLORS.primary : COLORS.surface,
              borderWidth: 1,
              borderColor: active ? COLORS.primary : COLORS.border,
              justifyContent: "center",
              shadowColor: active ? COLORS.primary : "transparent",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: active ? 0.3 : 0,
              shadowRadius: 8,
              elevation: active ? 3 : 0,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: active ? "#fff" : COLORS.mutedForeground,
                includeFontPadding: false,
                letterSpacing: 0.2,
              }}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
