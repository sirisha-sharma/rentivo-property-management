// Use the EXPO_PUBLIC_API_URL environment variable if available, otherwise fallback to localhost for dev
// Note: For physical devices, you must use your machine's LAN IP in the env var (e.g., http://192.168.1.176:3000/api)
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.176:3000/api";
