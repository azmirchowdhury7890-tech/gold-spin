import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import React, { useCallback, useState } from "react";
import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import { formatNumber } from "@/i18n/translations";

export const CHECKIN_REWARDS = [100, 200, 300, 400, 500, 700, 1_000];

export function getCheckInReward(streak: number): number {
  return CHECKIN_REWARDS[(Math.max(1, streak) - 1) % CHECKIN_REWARDS.length];
}

type Props = {
  visible: boolean;
  onClose: () => void;
};

const SCREEN_W = Dimensions.get("window").width;
const TILE_SIZE = Math.floor((SCREEN_W - 32 - 48) / 7); // 7 tiles, 32 side padding, 6*8 gaps

export function CheckInModal({ visible, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, language, streak, checkInAvailable, claimCheckIn } = useApp();

  const [claimed, setClaimed] = useState(false);
  const [reward, setReward] = useState(0);
  const [busy, setBusy] = useState(false);

  // Which day in the 7-day cycle are we on? (1–7)
  const dayInCycle = ((Math.max(1, streak) - 1) % 7) + 1;

  const handleClaim = useCallback(async () => {
    if (!checkInAvailable || busy || claimed) return;
    setBusy(true);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    const earned = await claimCheckIn();
    setReward(earned);
    setClaimed(true);
    setBusy(false);
  }, [checkInAvailable, busy, claimed, claimCheckIn]);

  const handleClose = () => {
    setClaimed(false);
    setReward(0);
    onClose();
  };

  const todayClaimed = !checkInAvailable || claimed;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <View />
      </Pressable>

      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            paddingBottom: insets.bottom + 20,
          },
        ]}
      >
        {/* Header */}
        <LinearGradient
          colors={["#1A1600", "#0B0B14"]}
          style={styles.headerGrad}
        >
          <View style={styles.pill} />
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={[styles.headerTitle, { color: colors.foreground }]}>
                {t("dailyCheckIn")}
              </Text>
              <View style={styles.streakRow}>
                <Feather name="zap" size={13} color={colors.gold} />
                <Text style={[styles.streakTxt, { color: colors.gold }]}>
                  {formatNumber(streak, language)}{" "}
                  {t("dayStreak")}
                </Text>
              </View>
            </View>
            <Pressable onPress={handleClose} hitSlop={12}>
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {t("checkInSubtitle")}
          </Text>
        </LinearGradient>

        {/* Day Tiles */}
        <View style={styles.tilesRow}>
          {CHECKIN_REWARDS.map((coins, idx) => {
            const dayNum = idx + 1;
            const isPast = dayNum < dayInCycle;
            const isToday = dayNum === dayInCycle;
            const isFuture = dayNum > dayInCycle;

            const glowing = isToday && !todayClaimed;
            const doneToday = isToday && todayClaimed;

            return (
              <View key={dayNum} style={styles.tileWrap}>
                {/* Day tile */}
                <LinearGradient
                  colors={
                    glowing
                      ? ["#3A2E00", "#2A2000"]
                      : isPast || doneToday
                      ? ["#1A1E00", "#151800"]
                      : ["#111118", "#0D0D16"]
                  }
                  style={[
                    styles.tile,
                    {
                      width: TILE_SIZE,
                      height: TILE_SIZE + 10,
                      borderColor: glowing
                        ? colors.gold
                        : isPast || doneToday
                        ? "#4A5200"
                        : colors.border,
                      borderWidth: glowing ? 1.5 : 1,
                    },
                  ]}
                >
                  {isPast || doneToday ? (
                    <Feather name="check-circle" size={TILE_SIZE * 0.38} color="#A0B800" />
                  ) : isFuture ? (
                    <Feather name="lock" size={TILE_SIZE * 0.34} color={colors.mutedForeground} />
                  ) : (
                    <Text style={{ fontSize: TILE_SIZE * 0.36 }}>⭐</Text>
                  )}
                  <Text
                    style={[
                      styles.tileCoins,
                      {
                        color: glowing
                          ? colors.gold
                          : isPast || doneToday
                          ? "#8A9800"
                          : colors.mutedForeground,
                        fontSize: TILE_SIZE * 0.22,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {coins >= 1000 ? "1K" : String(coins)}
                  </Text>
                </LinearGradient>
                {/* Day label below */}
                <Text
                  style={[
                    styles.dayLabel,
                    {
                      color: glowing ? colors.gold : colors.mutedForeground,
                      fontFamily: glowing ? "Inter_700Bold" : "Inter_400Regular",
                    },
                  ]}
                >
                  {t("day")} {dayNum}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Reward display after claim */}
        {claimed && reward > 0 && (
          <View
            style={[
              styles.rewardBanner,
              { borderColor: colors.gold, backgroundColor: "rgba(212,175,55,0.1)" },
            ]}
          >
            <Text style={{ fontSize: 22 }}>🎉</Text>
            <View>
              <Text style={[styles.rewardBannerTitle, { color: colors.gold }]}>
                +{formatNumber(reward, language)} {t("coins")}
              </Text>
              <Text style={[styles.rewardBannerSub, { color: colors.mutedForeground }]}>
                {t("checkInBonusAdded")}
              </Text>
            </View>
          </View>
        )}

        {/* CTA */}
        {todayClaimed && !claimed ? (
          <View style={[styles.claimedBox, { borderColor: colors.border }]}>
            <Feather name="clock" size={16} color={colors.mutedForeground} />
            <Text style={[styles.claimedTxt, { color: colors.mutedForeground }]}>
              {t("checkInAlreadyClaimed")}
            </Text>
          </View>
        ) : claimed ? (
          <Pressable
            style={[styles.cta, { opacity: 1 }]}
            onPress={handleClose}
          >
            <LinearGradient
              colors={["#F4D27A", "#D4AF37", "#8C6A1A"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaInner}
            >
              <Text style={styles.ctaTxt}>{t("awesome")}</Text>
            </LinearGradient>
          </Pressable>
        ) : (
          <Pressable
            disabled={busy}
            onPress={handleClaim}
            style={({ pressed }) => [
              styles.cta,
              { opacity: busy ? 0.7 : pressed ? 0.88 : 1 },
            ]}
          >
            <LinearGradient
              colors={["#F4D27A", "#D4AF37", "#8C6A1A"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaInner}
            >
              <Feather name="gift" size={18} color="#0B0B14" />
              <Text style={styles.ctaTxt}>
                {t("claimCheckIn")}{" "}
                +{formatNumber(getCheckInReward(streak), language)}{" "}
                {t("coins")}
              </Text>
            </LinearGradient>
          </Pressable>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
  },
  pill: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 12,
  },
  headerGrad: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  headerLeft: { gap: 4 },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  streakTxt: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 8,
  },

  tilesRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  tileWrap: {
    alignItems: "center",
    gap: 4,
  },
  tile: {
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: 4,
  },
  tileCoins: {
    fontFamily: "Inter_700Bold",
  },
  dayLabel: {
    fontSize: 9,
    letterSpacing: 0.2,
  },

  rewardBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rewardBannerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  rewardBannerSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 2,
  },

  claimedBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: "center",
  },
  claimedTxt: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },

  cta: {
    marginHorizontal: 16,
    marginBottom: 4,
    borderRadius: 14,
    overflow: "hidden",
  },
  ctaInner: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaTxt: {
    color: "#0B0B14",
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    letterSpacing: 0.2,
  },
});
