import React from "react";
import { View, Text, TouchableOpacity, SafeAreaView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS } from "../constants/theme";

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
        <SafeAreaView className="bg-background">
            <View className="flex-row items-center justify-between px-4 py-8 border-b border-border bg-background">
                <View className="flex-row items-center gap-3">
                    {showBack && (
                        <TouchableOpacity onPress={handleBack} className="p-1">
                            <Ionicons name="arrow-back" size={24} color={COLORS.foreground} />
                        </TouchableOpacity>
                    )}
                    <Text className="text-lg font-bold text-foreground">{title}</Text>
                </View>
                {rightIcon && (
                    <TouchableOpacity onPress={onRightPress} className="p-1">
                        <Ionicons name={rightIcon} size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                )}
            </View>
        </SafeAreaView>
    );
};
