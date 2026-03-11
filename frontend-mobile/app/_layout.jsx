import "../global.css";
import { Stack } from "expo-router";
import { AuthProvider } from "../context/AuthContext";
import { PropertyProvider } from "../context/PropertyContext";
import { TenantProvider } from "../context/TenantContext";
import { InvoiceProvider } from "../context/InvoiceContext";
import { MaintenanceProvider } from "../context/MaintenanceContext";
import { DocumentProvider } from "../context/DocumentContext";
import { NotificationProvider } from "../context/NotificationContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <PropertyProvider>
        <TenantProvider>
          <InvoiceProvider>
            <MaintenanceProvider>
              <DocumentProvider>
                <NotificationProvider>
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="index" />
                    <Stack.Screen name="register" />
                    <Stack.Screen name="dashboard" />
                    <Stack.Screen name="notifications" />
                    <Stack.Screen name="modal" />
                  </Stack>
                </NotificationProvider>
              </DocumentProvider>
            </MaintenanceProvider>
          </InvoiceProvider>
        </TenantProvider>
      </PropertyProvider>
    </AuthProvider>
  );
}
