import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS, SIZES } from "../constants/theme";

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
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.leftContainer}>
                    {showBack && (
                        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color={COLORS.foreground} />
                        </TouchableOpacity>
                    )}
                    <Text style={styles.title}>{title}</Text>
                </View>
                {rightIcon && (
                    <TouchableOpacity onPress={onRightPress} style={styles.rightButton}>
                        <Ionicons name={rightIcon} size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                )}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        backgroundColor: COLORS.background,
    },
    container: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        backgroundColor: COLORS.background,
    },
    leftContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    backButton: {
        padding: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: "bold",
        color: COLORS.foreground,
    },
    rightButton: {
        padding: 4,
    },
});
