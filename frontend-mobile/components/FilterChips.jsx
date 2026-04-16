import React from "react";
import { ScrollView, TouchableOpacity, Text, View } from "react-native";
import { COLORS } from "../constants/theme";

/**
 * Horizontal scrollable filter chip row for list screens.
 *
 * Props:
 *  options   — array of { key: string, label: string }
 *  selected  — currently selected key string
 *  onSelect  — (key: string) => void
 *  style     — optional outer container style
 */
export function FilterChips({ options, selected, onSelect, style }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[
        {
          paddingHorizontal: 16,
          paddingVertical: 10,
          gap: 8,
          flexDirection: "row",
          alignItems: "center",
        },
        style,
      ]}
      keyboardShouldPersistTaps="handled"
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
              paddingVertical: 7,
              borderRadius: 20,
              backgroundColor: active ? COLORS.primary : COLORS.muted,
              borderWidth: active ? 0 : 1,
              borderColor: COLORS.border,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: active ? "600" : "500",
                color: active ? "#fff" : COLORS.mutedForeground,
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
