import React, { useState } from "react";
import { View, TextInput, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";

/**
 * Consistent search input for list screens (dark mode).
 */
export function SearchBar({ value, onChangeText, placeholder = "Search…", style }) {
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: focused ? COLORS.primarySoft : COLORS.surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: focused ? COLORS.primary : COLORS.border,
          paddingHorizontal: 14,
          height: 48,
          gap: 10,
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
        placeholderTextColor={COLORS.faintForeground}
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
        keyboardAppearance="dark"
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
