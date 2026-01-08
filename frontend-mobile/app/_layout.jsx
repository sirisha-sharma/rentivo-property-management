import { Stack } from "expo-router";
import { AuthProvider } from "../context/AuthContext";
import { PropertyProvider } from "../context/PropertyContext";
import { TenantProvider } from "../context/TenantContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <PropertyProvider>
        <TenantProvider>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="dashboard" options={{ headerShown: false }} />
          </Stack>
        </TenantProvider>
      </PropertyProvider>
    </AuthProvider>
  );
}
