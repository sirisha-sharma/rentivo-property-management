// Premium dark-mode design language for Rentivo.
// Dark navy base, electric blue hero, soft lilac secondary, teal accent.
// All legacy tokens (background, card, muted, foreground, ...) keep their names
// so existing screens inherit the new look without wholesale rewrites.

export const COLORS = {
    // Brand accents
    primary: "#2F7BFF",            // Bright electric blue
    primaryDeep: "#0C63F6",        // Deep primary for hero surfaces
    primaryForeground: "#FFFFFF",
    primarySoft: "rgba(47, 123, 255, 0.16)", // Tint for chips/pills/icon backgrounds

    accentLilac: "#C8D2FF",        // Soft lilac secondary text/surface
    accentLilacSoft: "rgba(200, 210, 255, 0.12)",
    accentTeal: "#0C6F69",         // Teal accent for secondary CTA backdrops
    accentTealBright: "#34D4C6",   // Readable teal foreground on dark
    accentTealSoft: "rgba(52, 212, 198, 0.14)",

    // Base surfaces
    background: "#0D1018",         // Deep dark navy background
    surface: "#171C28",            // Surface (cards)
    surfaceElevated: "#202638",    // Elevated surface / inputs
    card: "#171C28",               // Card background (alias of surface)
    muted: "#202638",              // Subtle background chips
    input: "#141926",              // Form input background

    // Text
    foreground: "#F5F7FF",         // Primary text
    mutedForeground: "#A4AEC3",    // Secondary text
    faintForeground: "#6B7489",    // Tertiary / placeholder-tier text

    // Borders
    border: "#31384C",             // Default border
    borderStrong: "#3F4863",       // Stronger separators

    // Semantic colors
    destructive: "#F87171",
    destructiveDeep: "#EF4444",
    destructiveSoft: "rgba(239, 68, 68, 0.16)",

    success: "#34D399",
    successDeep: "#10B981",
    successSoft: "rgba(16, 185, 129, 0.16)",

    warning: "#FBBF24",
    warningDeep: "#F59E0B",
    warningSoft: "rgba(245, 158, 11, 0.18)",

    info: "#60A5FA",
    infoSoft: "rgba(96, 165, 250, 0.16)",

    // Overlays
    overlay: "rgba(13, 16, 24, 0.72)",
    scrim: "rgba(0, 0, 0, 0.5)",
};

// Expo's starter TypeScript utilities still reference a `Colors.light/dark` shape.
export const Colors = {
    light: {
        text: COLORS.foreground,
        background: COLORS.background,
        tint: COLORS.primary,
        icon: COLORS.mutedForeground,
        tabIconDefault: COLORS.mutedForeground,
        tabIconSelected: COLORS.primary,
    },
    dark: {
        text: COLORS.foreground,
        background: COLORS.background,
        tint: COLORS.primary,
        icon: COLORS.mutedForeground,
        tabIconDefault: COLORS.mutedForeground,
        tabIconSelected: COLORS.primary,
    },
};

export const SIZES = {
    base: 8,
    small: 12,
    font: 14,
    medium: 16,
    large: 18,
    extraLarge: 24,
    xxl: 32,
};

export const RADII = {
    sm: 10,
    md: 14,
    lg: 18,
    xl: 22,
    pill: 999,
};

export const SHADOWS = {
    none: {
        shadowColor: "transparent",
        shadowOpacity: 0,
        elevation: 0,
    },
    soft: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.28,
        shadowRadius: 14,
        elevation: 4,
    },
    lifted: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.35,
        shadowRadius: 22,
        elevation: 8,
    },
};
