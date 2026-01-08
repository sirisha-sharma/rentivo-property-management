import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "../constants/theme";

export const StatusBadge = ({ status }) => {
    const getStatusColor = () => {
        switch (status) {
            case "occupied":
            case "Active":
                return { bg: "#DCFCE7", text: "#166534" }; // green-100, green-800
            case "vacant":
            case "submitted":
                return { bg: "#FEF9C3", text: "#854D0E" }; // yellow-100, yellow-800
            case "maintenance":
            case "in-progress":
                return { bg: "#DBEAFE", text: "#1E40AF" }; // blue-100, blue-800
            default:
                return { bg: COLORS.muted, text: COLORS.mutedForeground };
        }
    };

    const colors = getStatusColor();

    return (
        <View style={[styles.badge, { backgroundColor: colors.bg }]}>
            <Text style={[styles.text, { color: colors.text }]}>{status}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    text: {
        fontSize: 12,
        fontWeight: "600",
        textTransform: "capitalize",
    },
});
