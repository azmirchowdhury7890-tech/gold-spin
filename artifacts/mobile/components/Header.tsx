import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import { formatNumber } from "@/i18n/translations";

type Props = {
  title?: string;
  subtitle?: string;
  showBalance?: boolean;
  style?: ViewStyle;
};

export function Header({ title, subtitle, showBalance = true, style }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { language, toggleLanguage, coins, t } = useApp();

  const topPad =
    Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top + 8;

  const onToggle = () => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync().catch(() => {});
    }
    toggleLanguage();
  };

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: colors.background, paddingTop: topPad },
        style,
      ]}
    >
      <View style={styles.row}>
        <View style={styles.left}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {title ?? t("appName")}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View style={styles.right}>
          {showBalance ? (
            <LinearGradient
              colors={["#1F1A0E", "#2A210F"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.balance, { borderColor: colors.gold }]}
            >
              <View style={[styles.coin, { backgroundColor: colors.gold }]}>
                <Text style={styles.coinGlyph}>৳</Text>
              </View>
              <Text style={[styles.balanceText, { color: colors.gold }]}>
                {formatNumber(coins, language)}
              </Text>
            </LinearGradient>
          ) : null}

          <Pressable
            onPress={onToggle}
            style={({ pressed }) => [
              styles.langBtn,
              {
                borderColor: colors.border,
                backgroundColor: colors.surfaceElevated,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Toggle language"
            testID="language-toggle"
          >
            <Feather name="globe" size={14} color={colors.gold} />
            <Text style={[styles.langText, { color: colors.foreground }]}>
              {language === "en" ? "EN" : "বাং"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: { flexShrink: 1, paddingRight: 12 },
  right: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 2,
  },
  balance: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  coin: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  coinGlyph: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    color: "#0B0B14",
  },
  balanceText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    letterSpacing: 0.2,
  },
  langBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  langText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 0.5,
  },
});
