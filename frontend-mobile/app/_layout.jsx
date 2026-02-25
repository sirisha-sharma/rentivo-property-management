import "../global.css";
import { Stack } from "expo-router";
import { AuthProvider } from "../context/AuthContext";
import { PropertyProvider } from "../context/PropertyContext";
import { TenantProvider } from "../context/TenantContext";
import { InvoiceProvider } from "../context/InvoiceContext";
import { MaintenanceProvider } from "../context/MaintenanceContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <PropertyProvider>
        <TenantProvider>
          <InvoiceProvider>
            <MaintenanceProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="dashboard" />
              </Stack>
            </MaintenanceProvider>
          </InvoiceProvider>
        </TenantProvider>
      </PropertyProvider>
    </AuthProvider>
  );
}
