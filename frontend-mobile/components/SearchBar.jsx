import React, { useState } from "react";
import { View, TextInput, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";

/**
 * Consistent search input for list screens.
 *
 * Props:
 *  value         — controlled string value
 *  onChangeText  — change handler
 *  placeholder   — input placeholder (default "Search…")
 *  style         — optional wrapper style override
 */
export function SearchBar({ value, onChangeText, placeholder = "Search…", style }) {
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: focused ? "#EFF6FF" : COLORS.input,
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: focused ? COLORS.primary : COLORS.border,
          paddingHorizontal: 12,
          height: 44,
          gap: 8,
        },
        style,
      ]}
    >
      <Ionicons
        name="search"
        size={18}
        color={focused ? COLORS.primary : COLORS.mutedForeground}
      />
      <TextInput
        style={{
          flex: 1,
          fontSize: 15,
          color: COLORS.foreground,
          includeFontPadding: false,
        }}
        placeholder={placeholder}
        placeholderTextColor={COLORS.mutedForeground}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        selectionColor={COLORS.primary}
        cursorColor={COLORS.primary}
        underlineColorAndroid="transparent"
      />
      {value.length > 0 && (
        <TouchableOpacity
          onPress={() => onChangeText("")}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close-circle" size={18} color={COLORS.mutedForeground} />
        </TouchableOpacity>
      )}
    </View>
  );
}
