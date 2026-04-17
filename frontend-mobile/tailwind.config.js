export const content = ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"];
export const presets = [require("nativewind/preset")];
export const theme = {
    extend: {
        colors: {
            primary: "#2F7BFF",
            primaryDeep: "#0C63F6",
            primaryForeground: "#FFFFFF",
            background: "#0D1018",
            surface: "#171C28",
            surfaceElevated: "#202638",
            card: "#171C28",
            foreground: "#F5F7FF",
            muted: "#202638",
            mutedForeground: "#A4AEC3",
            border: "#31384C",
            borderStrong: "#3F4863",
            input: "#141926",
            destructive: "#F87171",
            success: "#34D399",
            warning: "#FBBF24",
            info: "#60A5FA",
        },
    },
};
export const plugins = [];
