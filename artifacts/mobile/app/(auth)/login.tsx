import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

function mapAuthError(code: string | undefined, fallback: string): string {
  switch (code) {
    case "auth/invalid-email":
      return "Invalid email address";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Wrong email or password";
    case "auth/too-many-requests":
      return "Too many attempts. Try again later.";
    case "auth/network-request-failed":
      return "Network error. Check your connection.";
    default:
      return fallback;
  }
}

export default function LoginScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const { t, language, toggleLanguage } = useApp();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError(t("emailPasswordRequired"));
      return;
    }
    setBusy(true);
    try {
      await signIn(email, password);
      router.replace("/(tabs)");
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      setError(mapAuthError(code, t("loginFailed")));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.langRow}>
          <Pressable
            onPress={toggleLanguage}
            style={[styles.langBtn, { borderColor: colors.border }]}
          >
            <Feather name="globe" size={14} color={colors.gold} />
            <Text style={[styles.langTxt, { color: colors.foreground }]}>
              {language === "en" ? "EN" : "বাং"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.brandWrap}>
          <LinearGradient
            colors={["#F4D27A", "#D4AF37", "#8C6A1A"]}
            style={styles.logo}
          >
            <Text style={styles.logoTxt}>৳</Text>
          </LinearGradient>
          <Text style={[styles.brand, { color: colors.foreground }]}>
            {t("appName")}
          </Text>
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
            {t("loginTagline")}
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            {t("email")}
          </Text>
          <View
            style={[
              styles.inputWrap,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          >
            <Feather name="mail" size={16} color={colors.mutedForeground} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              style={[styles.input, { color: colors.foreground }]}
            />
          </View>

          <Text
            style={[
              styles.label,
              { color: colors.mutedForeground, marginTop: 14 },
            ]}
          >
            {t("password")}
          </Text>
          <View
            style={[
              styles.inputWrap,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          >
            <Feather name="lock" size={16} color={colors.mutedForeground} />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoComplete="password"
              secureTextEntry={!showPwd}
              style={[styles.input, { color: colors.foreground }]}
            />
            <Pressable onPress={() => setShowPwd((s) => !s)} hitSlop={8}>
              <Feather
                name={showPwd ? "eye-off" : "eye"}
                size={16}
                color={colors.mutedForeground}
              />
            </Pressable>
          </View>

          {error ? (
            <View
              style={[
                styles.errorBox,
                { borderColor: "#7E2D2D", backgroundColor: "#2A1414" },
              ]}
            >
              <Feather name="alert-circle" size={14} color="#FCA5A5" />
              <Text style={styles.errorTxt}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={onSubmit}
            disabled={busy}
            style={({ pressed }) => [
              styles.cta,
              { opacity: busy ? 0.7 : pressed ? 0.9 : 1 },
            ]}
          >
            <LinearGradient
              colors={["#F4D27A", "#D4AF37", "#8C6A1A"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaInner}
            >
              {busy ? (
                <ActivityIndicator color="#0B0B14" />
              ) : (
                <Text style={styles.ctaTxt}>{t("signIn")}</Text>
              )}
            </LinearGradient>
          </Pressable>

          <View style={styles.footer}>
            <Text style={{ color: colors.mutedForeground }}>
              {t("dontHaveAccount")}{" "}
            </Text>
            <Link href="/(auth)/signup" replace asChild>
              <Pressable>
                <Text style={[styles.linkTxt, { color: colors.gold }]}>
                  {t("createAccount")}
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 24, gap: 8 },
  langRow: { flexDirection: "row", justifyContent: "flex-end" },
  langBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  langTxt: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  brandWrap: { alignItems: "center", marginTop: 12, marginBottom: 28 },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  logoTxt: { fontFamily: "Inter_700Bold", fontSize: 38, color: "#0B0B14" },
  brand: { fontFamily: "Inter_700Bold", fontSize: 26, letterSpacing: 0.4 },
  tagline: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 4,
    textAlign: "center",
  },
  form: { gap: 4 },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
  },
  input: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    paddingVertical: 0,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 14,
  },
  errorTxt: {
    color: "#FCA5A5",
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    flex: 1,
  },
  cta: { marginTop: 22, borderRadius: 14, overflow: "hidden" },
  ctaInner: { height: 52, alignItems: "center", justifyContent: "center" },
  ctaTxt: {
    color: "#0B0B14",
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    letterSpacing: 0.3,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 22,
  },
  linkTxt: { fontFamily: "Inter_700Bold", fontSize: 14 },
});
