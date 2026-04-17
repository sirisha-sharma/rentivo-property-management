import React, { useState, forwardRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";

/**
 * Shared input primitive (dark mode). Used across auth + form screens.
 * Handles label, left icon, focus states, error states, password toggle.
 */
const AuthInput = forwardRef(function AuthInput(
  {
    label,
    value,
    onChangeText,
    placeholder,
    error,
    onFocus,
    onBlur,
    isPassword = false,
    showPassword = false,
    onTogglePassword,
    keyboardType = "default",
    autoCapitalize = "sentences",
    autoCorrect = false,
    returnKeyType = "next",
    onSubmitEditing,
    textContentType,
    leftIcon,
    style,
  },
  ref
) {
  const [focused, setFocused] = useState(false);
  const shouldTrackFocus = Platform.OS !== "android";
  const resolvedTextContentType =
    Platform.OS === "ios" ? textContentType : undefined;
  const resolvedAutoComplete =
    Platform.OS === "android" ? "off" : undefined;

  const hasError = Boolean(error);

  const borderColor = hasError
    ? COLORS.destructive
    : shouldTrackFocus && focused
    ? COLORS.primary
    : COLORS.border;

  const containerBg = hasError
    ? COLORS.destructiveSoft
    : shouldTrackFocus && focused
    ? COLORS.primarySoft
    : COLORS.input;

  const iconColor = hasError
    ? COLORS.destructive
    : shouldTrackFocus && focused
    ? COLORS.primary
    : COLORS.mutedForeground;

  const handleFocus = (event) => {
    if (shouldTrackFocus) setFocused(true);
    onFocus?.(event);
  };

  const handleBlur = (event) => {
    if (shouldTrackFocus) setFocused(false);
    onBlur?.(event);
  };

  return (
    <View style={[{ gap: 8 }, style]}>
      {label ? (
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: COLORS.mutedForeground,
            letterSpacing: 0.3,
            textTransform: "uppercase",
          }}
        >
          {label}
        </Text>
      ) : null}

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderWidth: 1.25,
          borderColor,
          borderRadius: 14,
          backgroundColor: containerBg,
          minHeight: 54,
          shadowColor: shouldTrackFocus && focused ? COLORS.primary : "transparent",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: shouldTrackFocus && focused ? 0.22 : 0,
          shadowRadius: 10,
          elevation: shouldTrackFocus && focused ? 3 : 0,
        }}
      >
        {leftIcon ? (
          <View style={{ paddingLeft: 16, paddingRight: 2 }}>
            <Ionicons name={leftIcon} size={18} color={iconColor} />
          </View>
        ) : null}

        <TextInput
          ref={ref}
          style={{
            flex: 1,
            paddingHorizontal: leftIcon ? 10 : 16,
            paddingVertical: 14,
            fontSize: 16,
            color: COLORS.foreground,
            includeFontPadding: false,
          }}
          placeholder={placeholder}
          placeholderTextColor={COLORS.faintForeground}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={isPassword && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={handleFocus}
          onBlur={handleBlur}
          textContentType={resolvedTextContentType}
          autoComplete={resolvedAutoComplete}
          importantForAutofill={Platform.OS === "android" ? "no" : "auto"}
          underlineColorAndroid="transparent"
          selectionColor={COLORS.primary}
          cursorColor={COLORS.primary}
          blurOnSubmit={returnKeyType === "done"}
          keyboardAppearance="dark"
        />

        {isPassword && onTogglePassword ? (
          <TouchableOpacity
            onPress={onTogglePassword}
            style={{ paddingHorizontal: 14, paddingVertical: 14 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={iconColor}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {hasError ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="alert-circle" size={13} color={COLORS.destructive} />
          <Text style={{ fontSize: 12, color: COLORS.destructive, flex: 1 }}>
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
});

export default AuthInput;
