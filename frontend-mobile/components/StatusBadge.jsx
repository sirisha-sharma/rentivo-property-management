import React from "react";
import { View, Text } from "react-native";
import { COLORS } from "../constants/theme";

// Dark-mode tuned status palette.
const STATUS_MAP = {
  // property states
  occupied: { bg: COLORS.successSoft, text: COLORS.success },
  vacant: { bg: COLORS.warningSoft, text: COLORS.warning },
  maintenance: { bg: COLORS.infoSoft, text: COLORS.info },

  // tenant states
  Active: { bg: COLORS.successSoft, text: COLORS.success },
  active: { bg: COLORS.successSoft, text: COLORS.success },
  Pending: { bg: COLORS.warningSoft, text: COLORS.warning },
  pending: { bg: COLORS.warningSoft, text: COLORS.warning },

  // maintenance states
  Open: { bg: COLORS.warningSoft, text: COLORS.warning },
  submitted: { bg: COLORS.warningSoft, text: COLORS.warning },
  "In Progress": { bg: COLORS.infoSoft, text: COLORS.info },
  "in-progress": { bg: COLORS.infoSoft, text: COLORS.info },
  Resolved: { bg: COLORS.successSoft, text: COLORS.success },

  // invoice states
  Paid: { bg: COLORS.successSoft, text: COLORS.success },
  paid: { bg: COLORS.successSoft, text: COLORS.success },
  Overdue: { bg: COLORS.destructiveSoft, text: COLORS.destructive },
  overdue: { bg: COLORS.destructiveSoft, text: COLORS.destructive },
};

/**
 * Pill badge for showing status labels on cards.
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
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor: colors.bg,
        alignSelf: "flex-start",
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: "700",
          color: colors.text,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {status}
      </Text>
    </View>
  );
};
