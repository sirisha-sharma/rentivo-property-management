import "../global.css";
import { Stack } from "expo-router";
import { AuthProvider } from "../context/AuthContext";
import { PropertyProvider } from "../context/PropertyContext";
import { TenantProvider } from "../context/TenantContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <PropertyProvider>
        <TenantProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="dashboard" />
          </Stack>
        </TenantProvider>
      </PropertyProvider>
    </AuthProvider>
  );
}
