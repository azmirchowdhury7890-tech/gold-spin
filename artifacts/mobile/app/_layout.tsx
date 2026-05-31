import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider } from "@/contexts/AppContext";
import { AuthProvider } from "@/contexts/AuthContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="gold-admin-control"
        options={{
          headerShown: true,
          title: "Admin Panel",
          headerStyle: { backgroundColor: "#0B0B14" },
          headerTintColor: "#D4AF37",
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Force-show the app after 4s even if fonts haven't loaded yet.
  // This prevents fontfaceobserver's 6000ms timeout from crashing the app.
  const [forceReady, setForceReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setForceReady(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  // On web: swallow unhandled fontfaceobserver timeout rejections so they
  // don't surface as a crash overlay.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const handler = (event: Event) => {
      const reason = (event as PromiseRejectionEvent).reason;
      const msg: string =
        reason?.message ?? (typeof reason === "string" ? reason : "");
      if (msg.includes("timeout") || msg.includes("fontface")) {
        event.preventDefault();
      }
    };
    window.addEventListener("unhandledrejection", handler);
    return () => window.removeEventListener("unhandledrejection", handler);
  }, []);

  const ready = fontsLoaded || !!fontError || forceReady;

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#0B0B14" }}>
            <KeyboardProvider>
              <AuthProvider>
                <AppProvider>
                  <StatusBar style="light" />
                  <RootLayoutNav />
                </AppProvider>
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
