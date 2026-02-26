import "../global.css";
import { Stack } from "expo-router";
import { AuthProvider } from "../context/AuthContext";
import { PropertyProvider } from "../context/PropertyContext";
import { TenantProvider } from "../context/TenantContext";
import { InvoiceProvider } from "../context/InvoiceContext";
import { MaintenanceProvider } from "../context/MaintenanceContext";
import { DocumentProvider } from "../context/DocumentContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <PropertyProvider>
        <TenantProvider>
          <InvoiceProvider>
            <MaintenanceProvider>
              <DocumentProvider>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="index" />
                  <Stack.Screen name="dashboard" />
                </Stack>
              </DocumentProvider>
            </MaintenanceProvider>
          </InvoiceProvider>
        </TenantProvider>
      </PropertyProvider>
    </AuthProvider>
  );
}
