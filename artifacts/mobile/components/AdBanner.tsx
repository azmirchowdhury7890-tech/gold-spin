import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";

export function AdBanner() {
  const colors = useColors();
  const { t } = useApp();

  return (
    <LinearGradient
      colors={["#15151F", "#1B1B28"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.wrap, { borderColor: colors.border }]}
    >
      <View style={[styles.tag, { backgroundColor: colors.gold }]}>
        <Text style={styles.tagText}>AD</Text>
      </View>
      <View style={styles.center}>
        <Feather name="image" size={18} color={colors.mutedForeground} />
        <Text style={[styles.text, { color: colors.mutedForeground }]}>
          {t("adPlaceholder")}
        </Text>
      </View>
      <Text style={[styles.sponsored, { color: colors.mutedForeground }]}>
        {t("sponsoredAd")}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 64,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    color: "#0B0B14",
    letterSpacing: 0.6,
  },
  center: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    justifyContent: "center",
  },
  text: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  sponsored: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});
