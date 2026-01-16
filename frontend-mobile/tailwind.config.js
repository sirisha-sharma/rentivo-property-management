export const content = ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"];
export const presets = [require("nativewind/preset")];
export const theme = {
    extend: {
        colors: {
            primary: "#2563EB",
            primaryForeground: "#FFFFFF",
            background: "#FFFFFF",
            card: "#FFFFFF",
            foreground: "#0F172A",
            muted: "#F1F5F9",
            mutedForeground: "#64748B",
            border: "#E2E8F0",
            input: "#F8FAFC",
            destructive: "#EF4444",
            success: "#10B981",
            warning: "#F59E0B",
        },
    },
};
export const plugins = [];
