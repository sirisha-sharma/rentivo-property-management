import React from "react";
import { View, Text } from "react-native";
import { COLORS } from "../constants/theme";

const STATUS_MAP = {
  // property states
  occupied: { bg: "#DCFCE7", text: "#166534" },
  vacant: { bg: "#FEF9C3", text: "#854D0E" },
  maintenance: { bg: "#DBEAFE", text: "#1E40AF" },

  // tenant states
  Active: { bg: "#DCFCE7", text: "#166534" },
  active: { bg: "#DCFCE7", text: "#166534" },
  Pending: { bg: "#FEF9C3", text: "#854D0E" },
  pending: { bg: "#FEF9C3", text: "#854D0E" },

  // maintenance states
  Open: { bg: "#FEF9C3", text: "#854D0E" },
  submitted: { bg: "#FEF9C3", text: "#854D0E" },
  "In Progress": { bg: "#DBEAFE", text: "#1E40AF" },
  "in-progress": { bg: "#DBEAFE", text: "#1E40AF" },
  Resolved: { bg: "#DCFCE7", text: "#166534" },

  // invoice states
  Paid: { bg: "#DCFCE7", text: "#166534" },
  paid: { bg: "#DCFCE7", text: "#166534" },
  Overdue: { bg: "#FEE2E2", text: "#991B1B" },
  overdue: { bg: "#FEE2E2", text: "#991B1B" },
};

/**
 * Pill badge for showing status labels on cards.
 * Handles all known status strings with correct color coding.
 */
export const StatusBadge = ({ status }) => {
  const colors = STATUS_MAP[status] ?? {
    bg: COLORS.muted,
    text: COLORS.mutedForeground,
  };

  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        backgroundColor: colors.bg,
        alignSelf: "flex-start",
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: "600",
          color: colors.text,
          textTransform: "capitalize",
        }}
      >
        {status}
      </Text>
    </View>
  );
};
