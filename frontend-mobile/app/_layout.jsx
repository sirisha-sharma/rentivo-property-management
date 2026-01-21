import "../global.css";
import { Stack } from "expo-router";
import { AuthProvider } from "../context/AuthContext";
import { PropertyProvider } from "../context/PropertyContext";
import { TenantProvider } from "../context/TenantContext";
import { InvoiceProvider } from "../context/InvoiceContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <PropertyProvider>
        <TenantProvider>
          <InvoiceProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="dashboard" />
            </Stack>
          </InvoiceProvider>
        </TenantProvider>
      </PropertyProvider>
    </AuthProvider>
  );
}
