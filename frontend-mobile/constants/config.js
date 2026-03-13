import { Platform } from "react-native";

// Update this if your local IP changes (for physical device testing)
const LAN_IP = "192.168.0.20";

export const API_BASE_URL =
    process.env.EXPO_PUBLIC_API_URL ||
    (Platform.OS === "web"
        ? "http://localhost:3000/api"
        : `http://${LAN_IP}:3000/api`);
