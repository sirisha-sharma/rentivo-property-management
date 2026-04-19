import "../global.css";
import { Stack } from "expo-router";
import { AuthProvider } from "../context/AuthContext";
import { PropertyProvider } from "../context/PropertyContext";
import { TenantProvider } from "../context/TenantContext";
import { InvoiceProvider } from "../context/InvoiceContext";
import { MaintenanceProvider } from "../context/MaintenanceContext";
import { DocumentProvider } from "../context/DocumentContext";
import { NotificationProvider } from "../context/NotificationContext";
import { MessageProvider } from "../context/MessageContext";
import { SubscriptionProvider } from "../context/SubscriptionContext";
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import AnimatedSplash from '../components/AnimatedSplash';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const [showCustomSplash, setShowCustomSplash] = useState(true);

  useEffect(() => {
    async function prepare() {
      try {
        await new Promise(resolve => setTimeout(resolve, 500));
      } finally {
        setAppReady(true);
        await SplashScreen.hideAsync();
      }
    }
    prepare();
  }, []);

  if (!appReady) return null;

  return (
    <AuthProvider>
      <SubscriptionProvider>
        <PropertyProvider>
          <TenantProvider>
            <InvoiceProvider>
              <MaintenanceProvider>
                <DocumentProvider>
                  <NotificationProvider>
                    <MessageProvider>
                      <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="index" />
                        <Stack.Screen name="register" />
                        <Stack.Screen name="dashboard" />
                        <Stack.Screen name="verify-2fa" />
                        <Stack.Screen name="profile" />
                        <Stack.Screen name="notifications" />
                        <Stack.Screen name="modal" />
                      </Stack>
                      {showCustomSplash && (
                        <AnimatedSplash onFinish={() => setShowCustomSplash(false)} />
                      )}
                    </MessageProvider>
                  </NotificationProvider>
                </DocumentProvider>
              </MaintenanceProvider>
            </InvoiceProvider>
          </TenantProvider>
        </PropertyProvider>
      </SubscriptionProvider>
    </AuthProvider>
  );
}