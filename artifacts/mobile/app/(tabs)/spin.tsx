import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import React, { useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AdBanner } from "@/components/AdBanner";
import { Header } from "@/components/Header";
import { RewardModal } from "@/components/RewardModal";
import { SpinWheel, type SpinWheelHandle } from "@/components/SpinWheel";
import { DAILY_SPIN_LIMIT, useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import { formatNumber } from "@/i18n/translations";

const SEGMENTS = [
  { value: 10, color: "#D4AF37" },
  { value: 25, color: "#F0D87C" },
  { value: 5, color: "#A8842A" },
  { value: 50, color: "#FFD86B" },
  { value: 15, color: "#C49A2A" },
  { value: 100, color: "#FFE89A" },
  { value: 20, color: "#B8902B" },
  { value: 75, color: "#E5C46A" },
];

export default function SpinScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    t,
    language,
    spinsLeft,
    recordSpinUsed,
    addCoins,
  } = useApp();
  const wheelRef = useRef<SpinWheelHandle>(null);
  const [spinning, setSpinning] = useState(false);
  const [reward, setReward] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);

  const screenW = Dimensions.get("window").width;
  const wheelSize = Math.min(screenW - 60, 320);

  const segments = useMemo(
    () =>
      SEGMENTS.map((s) => ({
        ...s,
        label: String(s.value),
      })),
    [],
  );

  const onSpin = async () => {
    if (spinning || spinsLeft <= 0) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    setSpinning(true);
    const idx = Math.floor(Math.random() * segments.length);
    const won = segments[idx].value;
    wheelRef.current?.spinTo(idx, async () => {
      await recordSpinUsed();
      await addCoins(won, "spin");
      setReward(won);
      setModalVisible(true);
      setSpinning(false);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        ).catch(() => {});
      }
    });
  };

  const bottomPad = (Platform.OS === "web" ? 84 : 72) + 20;
  const canSpin = spinsLeft > 0 && !spinning;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Header
        title={t("spinAndWin")}
        subtitle={`${formatNumber(spinsLeft, language)} / ${formatNumber(DAILY_SPIN_LIMIT, language)} ${t("dailySpinsLeft").toLowerCase()}`}
      />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: bottomPad + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero pillar */}
        <LinearGradient
          colors={["#1A1626", "#0B0B14"]}
          style={[styles.hero, { borderColor: colors.border }]}
        >
          <View style={styles.spinsTop}>
            <View style={[styles.spinsPill, { borderColor: colors.gold }]}>
              <MaterialCommunityIcons name="lightning-bolt" size={14} color={colors.gold} />
              <Text style={[styles.spinsText, { color: colors.gold }]}>
                {formatNumber(spinsLeft, language)} {t("spin").toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.perSpin, { color: colors.mutedForeground }]}>
              {t("perSpin")} · 5–100 {t("coins")}
            </Text>
          </View>

          <View style={styles.wheelArea}>
            <SpinWheel
              ref={wheelRef}
              size={wheelSize}
              segments={segments}
              language={language}
            />
          </View>

          <Pressable
            onPress={onSpin}
            disabled={!canSpin}
            style={({ pressed }) => [
              styles.spinBtnWrap,
              { opacity: canSpin ? (pressed ? 0.9 : 1) : 0.5 },
            ]}
            testID="spin-button"
          >
            <LinearGradient
              colors={["#FFD86B", "#D4AF37", "#8C6F1B"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.spinBtn}
            >
              <MaterialCommunityIcons
                name={spinning ? "loading" : "rotate-360"}
                size={22}
                color="#0B0B14"
              />
              <Text style={styles.spinBtnText}>
                {spinning
                  ? t("spinning")
                  : spinsLeft > 0
                    ? t("spinNow")
                    : t("noSpinsLeft")}
              </Text>
            </LinearGradient>
          </Pressable>

          {spinsLeft <= 0 && (
            <Text style={[styles.helpText, { color: colors.mutedForeground }]}>
              {t("comeBackTomorrow")}
            </Text>
          )}
        </LinearGradient>

        <AdBanner />
      </ScrollView>

      <RewardModal
        visible={modalVisible}
        reward={reward}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 4,
    gap: 18,
  },
  hero: {
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 18,
  },
  spinsTop: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  spinsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  spinsText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  perSpin: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  wheelArea: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  spinBtnWrap: {
    width: "100%",
    borderRadius: 999,
    shadowColor: "#D4AF37",
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  spinBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 999,
  },
  spinBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#0B0B14",
    letterSpacing: 0.4,
  },
  helpText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    textAlign: "center",
    marginTop: -6,
  },
});
