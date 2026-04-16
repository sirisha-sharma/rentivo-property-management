import React from "react";
import { ScrollView, TouchableOpacity, Text } from "react-native";
import { COLORS } from "../constants/theme";

/**
 * Horizontal scrollable filter chip row for list screens.
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
      style={[
        {
          flexGrow: 0,
        },
        style,
      ]}
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
            activeOpacity={0.7}
            style={{
              paddingHorizontal: 14,
              minHeight: 34,
              paddingVertical: 7,
              borderRadius: 20,
              backgroundColor: active ? COLORS.primary : COLORS.muted,
              borderWidth: active ? 0 : 1,
              borderColor: COLORS.border,
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: active ? "600" : "500",
                color: active ? "#fff" : COLORS.mutedForeground,
                includeFontPadding: false,
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
