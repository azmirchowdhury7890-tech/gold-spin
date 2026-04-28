import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
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
import { ScratchCard } from "@/components/ScratchCard";
import { DAILY_SCRATCH_LIMIT, useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import { formatNumber } from "@/i18n/translations";

const REWARDS = [10, 20, 30, 50, 75, 100, 150, 200];

function pickReward(): number {
  return REWARDS[Math.floor(Math.random() * REWARDS.length)];
}

export default function ScratchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    t,
    language,
    scratchesLeft,
    recordScratchUsed,
    addCoins,
  } = useApp();

  const [cardKey, setCardKey] = useState<number>(() => Date.now());
  const [reward, setReward] = useState<number>(() => pickReward());
  const [revealed, setRevealed] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const handleRevealed = async (won: number) => {
    if (revealed) return;
    setRevealed(true);
    await recordScratchUsed();
    await addCoins(won, "scratch");
    setTimeout(() => setModalVisible(true), 600);
  };

  const newCard = () => {
    if (scratchesLeft <= 0) return;
    if (Platform.OS !== "web") {
      Haptics.selectionAsync().catch(() => {});
    }
    setReward(pickReward());
    setCardKey(Date.now());
    setRevealed(false);
  };

  const bottomPad = (Platform.OS === "web" ? 84 : 72) + 20;
  const canDraw = scratchesLeft > 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Header
        title={t("scratchAndWin")}
        subtitle={`${formatNumber(scratchesLeft, language)} / ${formatNumber(DAILY_SCRATCH_LIMIT, language)} ${t("dailyScratchesLeft").toLowerCase()}`}
      />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: bottomPad + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["#1A1626", "#0B0B14"]}
          style={[styles.hero, { borderColor: colors.border }]}
        >
          <View style={styles.headerRow}>
            <View style={[styles.spinsPill, { borderColor: colors.gold }]}>
              <MaterialCommunityIcons name="ticket" size={14} color={colors.gold} />
              <Text style={[styles.spinsText, { color: colors.gold }]}>
                {formatNumber(scratchesLeft, language)} {t("scratch").toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.perCard, { color: colors.mutedForeground }]}>
              {t("perCard")} · 10–200 {t("coins")}
            </Text>
          </View>

          {canDraw ? (
            <ScratchCard
              key={cardKey}
              cardKey={cardKey}
              reward={reward}
              onRevealed={handleRevealed}
            />
          ) : (
            <View style={[styles.empty, { borderColor: colors.border }]}>
              <View style={[styles.emptyIcon, { borderColor: colors.gold }]}>
                <Feather name="clock" size={28} color={colors.gold} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {t("noScratchesLeft")}
              </Text>
              <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
                {t("comeBackTomorrow")}
              </Text>
            </View>
          )}

          {canDraw && (
            <Pressable
              onPress={newCard}
              disabled={!revealed}
              style={({ pressed }) => [
                styles.cta,
                {
                  backgroundColor: revealed ? colors.gold : colors.muted,
                  opacity: revealed ? (pressed ? 0.85 : 1) : 0.6,
                },
              ]}
            >
              <Feather
                name="refresh-cw"
                size={16}
                color={revealed ? "#0B0B14" : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.ctaText,
                  {
                    color: revealed ? "#0B0B14" : colors.mutedForeground,
                  },
                ]}
              >
                {revealed ? t("newCard") : t("swipeToScratch")}
              </Text>
            </Pressable>
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
    padding: 16,
    gap: 16,
  },
  headerRow: {
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
  perCard: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  empty: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 24,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    textAlign: "center",
  },
  emptyBody: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 999,
  },
  ctaText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    letterSpacing: 0.3,
  },
});
