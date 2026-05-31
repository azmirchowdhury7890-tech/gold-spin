// Patch fontfaceobserver BEFORE any imports run on web.
// Must be at the very top of the module so it registers before
// @expo-google-fonts fires its 6 000 ms rejection.
if (typeof window !== "undefined") {
  window.addEventListener(
    "unhandledrejection",
    (e) => {
      const msg = String(
        (e as PromiseRejectionEvent).reason?.message ??
          (e as PromiseRejectionEvent).reason ??
          "",
      );
      // Silence fontfaceobserver "Xms timeout exceeded" errors
      if (/\d+ms/.test(msg) && msg.toLowerCase().includes("timeout")) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    true, // useCapture so we run before Expo's error overlay handler
  );
}

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

// On web: inject Inter from Google Fonts CDN so fontfaceobserver is
// never invoked for these weights.
if (Platform.OS === "web" && typeof document !== "undefined") {
  const existing = document.getElementById("__goldspin_gfonts");
  if (!existing) {
    const link = document.createElement("link");
    link.id = "__goldspin_gfonts";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
  }
}

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
  // On web: pass empty object so useFonts resolves instantly without
  // invoking fontfaceobserver at all. Fonts come from the CDN link above.
  const isWeb = Platform.OS === "web";

  const [fontsLoaded, fontError] = useFonts(
    isWeb
      ? {}
      : {
          Inter_400Regular,
          Inter_500Medium,
          Inter_600SemiBold,
          Inter_700Bold,
        },
  );

  // Safety net: show app after 3 s regardless of font state.
  const [forceReady, setForceReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setForceReady(true), 3000);
    return () => clearTimeout(t);
  }, []);

  const ready = fontsLoaded || !!fontError || forceReady;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
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
