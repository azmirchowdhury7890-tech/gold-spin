import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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
import { CheckInModal } from "@/components/CheckInModal";
import { Header } from "@/components/Header";
import { InviteSheet } from "@/components/InviteSheet";
import { RewardedAdModal } from "@/components/RewardedAdModal";
import {
  DAILY_SPIN_LIMIT,
  coinsToBdt,
  coinsToUsd,
  useApp,
} from "@/contexts/AppContext";
import { showRewardedAd } from "@/lib/admob";
import { useColors } from "@/hooks/useColors";
import { formatNumber } from "@/i18n/translations";

const REWARDED_AD_REWARD = 500;

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    t,
    language,
    coins,
    todayEarnings,
    streak,
    spinsUsed,
    scratchesUsed,
    adClaimedToday,
    claimAdReward,
    checkInAvailable,
  } = useApp();
  const [adVisible, setAdVisible] = useState(false);
  const [inviteVisible, setInviteVisible] = useState(false);
  const [checkInVisible, setCheckInVisible] = useState(false);

  // Auto-show check-in modal once on mount if today's bonus not yet claimed
  useEffect(() => {
    if (checkInAvailable) {
      const timer = setTimeout(() => setCheckInVisible(true), 600);
      return () => clearTimeout(timer);
    }
  }, [checkInAvailable]);

  const handleWatchAd = async () => {
    const result = await showRewardedAd();
    if (result === "rewarded") {
      // Real AdMob ad completed — grant 500 coins directly
      await claimAdReward(REWARDED_AD_REWARD);
    } else if (result === "unavailable" || result === "error") {
      // No real ad available (web / no network) — fall back to simulated modal
      setAdVisible(true);
    }
    // "closed_early" → user dismissed ad, no reward
  };

  const tasks = [
    {
      key: "spin",
      icon: "rotate-360" as const,
      iconLib: "mcci" as const,
      title: t("spinTask"),
      progress: Math.min(1, spinsUsed / 1),
      done: spinsUsed >= 1,
      action: () => router.push("/spin"),
      cta: t("spinNow"),
    },
    {
      key: "scratch",
      icon: "card-bulleted-outline" as const,
      iconLib: "mcci" as const,
      title: t("scratchTask"),
      progress: Math.min(1, scratchesUsed / 1),
      done: scratchesUsed >= 1,
      action: () => router.push("/scratch"),
      cta: t("scratchNow"),
    },
    {
      key: "ad",
      icon: "play-circle" as const,
      iconLib: "feather" as const,
      title: t("watchAdTask"),
      progress: adClaimedToday ? 1 : 0,
      done: adClaimedToday,
      action: handleWatchAd,
      cta: t("watchAd"),
    },
  ];

  const bottomPad = (Platform.OS === "web" ? 84 : 72) + 20;
  const bdtValue = coinsToBdt(coins);
  const usdValue = coinsToUsd(coins);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Header />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: bottomPad + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.greet, { color: colors.mutedForeground }]}>
          {t("welcome")}
        </Text>

        {/* Balance card */}
        <LinearGradient
          colors={["#2A210F", "#15151F"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.balanceCard, { borderColor: colors.gold }]}
        >
          <View style={styles.balanceTop}>
            <View>
              <Text
                style={[styles.balanceLabel, { color: colors.mutedForeground }]}
              >
                {t("balance")}
              </Text>
              <View style={styles.balanceRow}>
                <View
                  style={[styles.coinBig, { backgroundColor: colors.gold }]}
                >
                  <Text style={styles.coinGlyph}>৳</Text>
                </View>
                <Text
                  style={[styles.balanceValue, { color: colors.foreground }]}
                >
                  {formatNumber(coins, language)}
                </Text>
              </View>
              <Text style={[styles.coinUnit, { color: colors.gold }]}>
                {t("coins")}
              </Text>
            </View>
            <View style={[styles.streakBadge, { borderColor: colors.gold }]}>
              <MaterialCommunityIcons
                name="fire"
                size={16}
                color={colors.gold}
              />
              <Text style={[styles.streakNumber, { color: colors.gold }]}>
                {formatNumber(streak, language)}
              </Text>
              <Text
                style={[styles.streakLabel, { color: colors.mutedForeground }]}
              >
                {t("streakDays")}
              </Text>
            </View>
          </View>

          {/* Equivalent currency row */}
          <View style={styles.equivRow}>
            <View
              style={[
                styles.equivPill,
                {
                  backgroundColor: "rgba(212,175,55,0.10)",
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.equivCurrency, { color: colors.gold }]}>
                ৳
              </Text>
              <Text
                style={[styles.equivValue, { color: colors.foreground }]}
              >
                {formatNumber(Math.floor(bdtValue * 100) / 100, language)}
              </Text>
              <Text
                style={[styles.equivLabel, { color: colors.mutedForeground }]}
              >
                {t("bdt")}
              </Text>
            </View>
            <View
              style={[
                styles.equivPill,
                {
                  backgroundColor: "rgba(212,175,55,0.10)",
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.equivCurrency, { color: colors.gold }]}>
                $
              </Text>
              <Text
                style={[styles.equivValue, { color: colors.foreground }]}
              >
                {usdValue.toFixed(4)}
              </Text>
              <Text
                style={[styles.equivLabel, { color: colors.mutedForeground }]}
              >
                {t("usd")}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text
                style={[styles.statLabel, { color: colors.mutedForeground }]}
              >
                {t("todaysEarnings")}
              </Text>
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                +{formatNumber(todayEarnings, language)}
              </Text>
            </View>
            <View
              style={[
                styles.statDivider,
                { backgroundColor: colors.border },
              ]}
            />
            <View style={styles.stat}>
              <Text
                style={[styles.statLabel, { color: colors.mutedForeground }]}
              >
                {t("dailySpinsLeft")}
              </Text>
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {formatNumber(
                  Math.max(0, DAILY_SPIN_LIMIT - spinsUsed),
                  language,
                )}
                <Text
                  style={[styles.statSub, { color: colors.mutedForeground }]}
                >
                  {" "}
                  / {formatNumber(DAILY_SPIN_LIMIT, language)}
                </Text>
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Quick actions */}
        <View style={styles.quickRow}>
          <QuickAction
            label={t("spinAndWin")}
            icon={
              <MaterialCommunityIcons
                name="rotate-360"
                size={26}
                color={colors.gold}
              />
            }
            onPress={() => router.push("/spin")}
          />
          <QuickAction
            label={t("scratchAndWin")}
            icon={
              <MaterialCommunityIcons
                name="card-bulleted-outline"
                size={26}
                color={colors.gold}
              />
            }
            onPress={() => router.push("/scratch")}
          />
          <QuickAction
            label={t("dailyCheckIn")}
            icon={<Feather name="gift" size={26} color={checkInAvailable ? colors.gold : colors.mutedForeground} />}
            onPress={() => setCheckInVisible(true)}
            badge={checkInAvailable}
          />
        </View>

        {/* Daily tasks */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {t("dailyTasks")}
          </Text>
          <View style={[styles.bonusPill, { backgroundColor: colors.gold }]}>
            <Text style={styles.bonusPillText}>{t("bonus")}</Text>
          </View>
        </View>

        <View style={styles.tasks}>
          {tasks.map((task) => (
            <View
              key={task.key}
              style={[
                styles.taskCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.taskIcon,
                  {
                    backgroundColor: task.done ? colors.gold : "#2A2335",
                  },
                ]}
              >
                {task.iconLib === "mcci" ? (
                  <MaterialCommunityIcons
                    name={task.icon as never}
                    size={22}
                    color={task.done ? "#0B0B14" : colors.gold}
                  />
                ) : (
                  <Feather
                    name={task.icon as never}
                    size={22}
                    color={task.done ? "#0B0B14" : colors.gold}
                  />
                )}
              </View>
              <View style={styles.taskBody}>
                <Text style={[styles.taskTitle, { color: colors.foreground }]}>
                  {task.title}
                </Text>
                <View
                  style={[styles.progressBg, { backgroundColor: colors.muted }]}
                >
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: colors.gold,
                        width: `${task.progress * 100}%`,
                      },
                    ]}
                  />
                </View>
              </View>
              <Pressable
                disabled={task.done}
                onPress={task.action}
                style={({ pressed }) => [
                  styles.taskBtn,
                  {
                    backgroundColor: task.done ? colors.muted : colors.gold,
                    opacity: pressed && !task.done ? 0.85 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.taskBtnText,
                    {
                      color: task.done ? colors.mutedForeground : "#0B0B14",
                    },
                  ]}
                  numberOfLines={1}
                >
                  {task.done ? t("completed") : task.cta}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>

        {/* Banner ad */}
        <View style={{ marginTop: 8 }}>
          <AdBanner />
        </View>

        {/* Invite */}
        <Pressable
          onPress={() => setInviteVisible(true)}
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
        >
          <LinearGradient
            colors={["#15151F", "#1F1F2C"]}
            style={[styles.inviteCard, { borderColor: colors.gold }]}
          >
            <View style={[styles.inviteIcon, { borderColor: colors.gold }]}>
              <Feather name="user-plus" size={20} color={colors.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inviteTitle, { color: colors.foreground }]}>
                {t("invite")}
              </Text>
              <Text
                style={[styles.inviteBody, { color: colors.mutedForeground }]}
              >
                {t("inviteReward")}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.gold} />
          </LinearGradient>
        </Pressable>
      </ScrollView>

      <RewardedAdModal
        visible={adVisible}
        onClose={() => setAdVisible(false)}
        duration={5}
        title={t("rewardedAdTitle")}
        body={t("rewardedAdBody")}
        rewardLabel={`+${formatNumber(REWARDED_AD_REWARD, language)} ${t("coins")}`}
        ctaLabel={`${t("watchAd")} · +${formatNumber(REWARDED_AD_REWARD, language)}`}
        onCompleted={() => {
          claimAdReward(REWARDED_AD_REWARD);
        }}
      />

      <InviteSheet
        visible={inviteVisible}
        onClose={() => setInviteVisible(false)}
      />

      <CheckInModal
        visible={checkInVisible}
        onClose={() => setCheckInVisible(false)}
      />
    </View>
  );
}

function QuickAction({
  label,
  icon,
  onPress,
  badge,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  badge?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flex: 1,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <LinearGradient
        colors={badge ? ["#2A2000", "#15151F"] : ["#1F1F2C", "#15151F"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.quick,
          {
            borderColor: badge ? colors.gold : colors.border,
            borderWidth: badge ? 1.5 : 1,
          },
        ]}
      >
        <View style={[styles.quickIcon, { borderColor: badge ? colors.gold : colors.border }]}>
          {icon}
        </View>
        <Text style={[styles.quickLabel, { color: badge ? colors.gold : colors.foreground }]}>
          {label}
        </Text>
        {badge ? (
          <View style={styles.badgeDot} />
        ) : (
          <Feather
            name="arrow-right"
            size={16}
            color={colors.gold}
            style={{ position: "absolute", top: 14, right: 14 }}
          />
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 4,
    gap: 18,
  },
  greet: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  balanceCard: {
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 20,
    overflow: "hidden",
  },
  balanceTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  balanceLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
  },
  coinBig: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  coinGlyph: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: "#0B0B14",
  },
  balanceValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 38,
    letterSpacing: -1,
  },
  coinUnit: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 2,
  },
  equivRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  equivPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  equivCurrency: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  equivValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    letterSpacing: -0.2,
  },
  equivLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginLeft: "auto",
  },
  streakBadge: {
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    gap: 2,
    minWidth: 76,
  },
  streakNumber: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    lineHeight: 22,
  },
  streakLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 16,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stat: { flex: 1 },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
    marginHorizontal: 16,
  },
  statLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  statValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    marginTop: 4,
  },
  statSub: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  quickRow: {
    flexDirection: "row",
    gap: 12,
  },
  quick: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    minHeight: 110,
    justifyContent: "space-between",
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    letterSpacing: -0.2,
    marginTop: 12,
  },
  badgeDot: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#D4AF37",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    letterSpacing: -0.2,
  },
  bonusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  bonusPillText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    color: "#0B0B14",
    letterSpacing: 0.6,
  },
  tasks: {
    gap: 10,
  },
  taskCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  taskIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  taskBody: {
    flex: 1,
    gap: 8,
  },
  taskTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  progressBg: {
    height: 5,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: 5,
    borderRadius: 999,
  },
  taskBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    minWidth: 80,
    alignItems: "center",
  },
  taskBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    letterSpacing: 0.2,
  },
  inviteCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  inviteIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  inviteTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  inviteBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
});
