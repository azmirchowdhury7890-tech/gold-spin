import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
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
import {
  COINS_PER_BDT,
  type CurrencyCode,
  MIN_WITHDRAW,
  METHODS_BY_CURRENCY,
  type Transaction,
  USD_PER_COIN,
  type WithdrawMethod,
  coinsToBdt,
  coinsToUsd,
  useApp,
} from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import { formatNumber } from "@/i18n/translations";

const METHOD_LABEL_KEY: Record<WithdrawMethod, "bkash" | "nagad" | "binanceUsdt" | "paypal"> = {
  bkash: "bkash",
  nagad: "nagad",
  binance: "binanceUsdt",
  paypal: "paypal",
};

const METHOD_ICON: Record<
  WithdrawMethod,
  { lib: "mcci" | "feather"; name: string; tint: string }
> = {
  bkash: { lib: "mcci", name: "cellphone", tint: "#E2136E" },
  nagad: { lib: "mcci", name: "cellphone-wireless", tint: "#F58220" },
  binance: { lib: "mcci", name: "currency-btc", tint: "#F0B90B" },
  paypal: { lib: "feather", name: "dollar-sign", tint: "#0070BA" },
};

export default function WalletScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, language, coins, todayEarnings, transactions, withdraw } = useApp();
  const [currency, setCurrency] = useState<CurrencyCode>("BDT");
  const [method, setMethod] = useState<WithdrawMethod>("bkash");
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [lastPayout, setLastPayout] = useState<{
    currency: CurrencyCode;
    method: WithdrawMethod;
    amount: number;
  } | null>(null);

  // When currency changes, reset method to first valid one
  useEffect(() => {
    setMethod(METHODS_BY_CURRENCY[currency][0]);
  }, [currency]);

  const totalEarned = useMemo(
    () =>
      transactions.reduce(
        (sum, tx) => (tx.amount > 0 ? sum + tx.amount : sum),
        0,
      ),
    [transactions],
  );

  const canWithdraw = coins >= MIN_WITHDRAW;
  const payoutAmount =
    currency === "BDT" ? coinsToBdt(MIN_WITHDRAW) : coinsToUsd(MIN_WITHDRAW);
  const balanceBdt = coinsToBdt(coins);
  const balanceUsd = coinsToUsd(coins);

  const onWithdrawPress = () => {
    if (!canWithdraw) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning,
        ).catch(() => {});
      }
      return;
    }
    if (Platform.OS !== "web") {
      Haptics.selectionAsync().catch(() => {});
    }
    setConfirmVisible(true);
  };

  const confirmWithdraw = async () => {
    const ok = await withdraw(MIN_WITHDRAW, currency, method, payoutAmount);
    setConfirmVisible(false);
    if (ok) {
      setLastPayout({ currency, method, amount: payoutAmount });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        ).catch(() => {});
      }
      setSuccessVisible(true);
    }
  };

  const formatPayout = (cur: CurrencyCode, amt: number) =>
    cur === "BDT"
      ? `৳${formatNumber(Math.round(amt), language)} ${t("bdt")}`
      : `$${amt.toFixed(2)} ${t("usd")}`;

  const bottomPad = (Platform.OS === "web" ? 84 : 72) + 20;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Header title={t("wallet")} />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: bottomPad + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Earnings card */}
        <LinearGradient
          colors={["#2A210F", "#15151F"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, { borderColor: colors.gold }]}
        >
          <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>
            {t("availableBalance")}
          </Text>
          <View style={styles.amountRow}>
            <View style={[styles.coinIcon, { backgroundColor: colors.gold }]}>
              <Text style={styles.coinGlyph}>৳</Text>
            </View>
            <Text style={[styles.amount, { color: colors.foreground }]}>
              {formatNumber(coins, language)}
            </Text>
          </View>
          <Text style={[styles.coinUnit, { color: colors.gold }]}>
            {t("coins")}
          </Text>

          {/* Currency equivalents */}
          <View style={styles.equivRow}>
            <View
              style={[
                styles.equivPill,
                { borderColor: colors.border, backgroundColor: "rgba(0,0,0,0.2)" },
              ]}
            >
              <Text style={[styles.equivCurrency, { color: colors.gold }]}>
                ৳
              </Text>
              <Text style={[styles.equivValue, { color: colors.foreground }]}>
                {formatNumber(Math.floor(balanceBdt * 100) / 100, language)}
              </Text>
              <Text style={[styles.equivLabel, { color: colors.mutedForeground }]}>
                {t("bdt")}
              </Text>
            </View>
            <View
              style={[
                styles.equivPill,
                { borderColor: colors.border, backgroundColor: "rgba(0,0,0,0.2)" },
              ]}
            >
              <Text style={[styles.equivCurrency, { color: colors.gold }]}>
                $
              </Text>
              <Text style={[styles.equivValue, { color: colors.foreground }]}>
                {balanceUsd.toFixed(4)}
              </Text>
              <Text style={[styles.equivLabel, { color: colors.mutedForeground }]}>
                {t("usd")}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                {t("totalEarnings")}
              </Text>
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {formatNumber(totalEarned, language)}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.stat}>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                {t("todaysEarnings")}
              </Text>
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                +{formatNumber(todayEarnings, language)}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Withdraw section */}
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {t("withdraw")}
          </Text>

          {/* Currency selector */}
          <Text style={[styles.sublabel, { color: colors.mutedForeground }]}>
            {t("selectCurrency")}
          </Text>
          <View
            style={[
              styles.segmentWrap,
              { backgroundColor: colors.muted, borderColor: colors.border },
            ]}
          >
            {(["BDT", "USD"] as CurrencyCode[]).map((cur) => {
              const active = currency === cur;
              return (
                <Pressable
                  key={cur}
                  onPress={() => {
                    if (Platform.OS !== "web") {
                      Haptics.selectionAsync().catch(() => {});
                    }
                    setCurrency(cur);
                  }}
                  style={[
                    styles.segmentBtn,
                    active && {
                      backgroundColor: colors.gold,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      { color: active ? "#0B0B14" : colors.foreground },
                    ]}
                  >
                    {cur === "BDT" ? `৳ ${t("bdt")}` : `$ ${t("usd")}`}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Rate */}
          <View
            style={[
              styles.rateRow,
              {
                backgroundColor: "rgba(212,175,55,0.08)",
                borderColor: colors.border,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.rateLabel, { color: colors.mutedForeground }]}>
                {t("exchangeRate")}
              </Text>
              <Text style={[styles.rateValue, { color: colors.foreground }]}>
                {formatNumber(COINS_PER_BDT, language)} {t("coins")} ={" "}
                {currency === "BDT"
                  ? `৳1 ${t("bdt")}`
                  : `$${(USD_PER_COIN * COINS_PER_BDT).toFixed(4)} ${t("usd")}`}
              </Text>
            </View>
            <Feather name="repeat" size={18} color={colors.gold} />
          </View>

          {/* Method selector */}
          <Text
            style={[
              styles.sublabel,
              { color: colors.mutedForeground, marginTop: 14 },
            ]}
          >
            {t("chooseMethod")}
          </Text>
          <View style={styles.methodsRow}>
            {METHODS_BY_CURRENCY[currency].map((m) => {
              const active = method === m;
              const icon = METHOD_ICON[m];
              return (
                <Pressable
                  key={m}
                  onPress={() => {
                    if (Platform.OS !== "web") {
                      Haptics.selectionAsync().catch(() => {});
                    }
                    setMethod(m);
                  }}
                  style={({ pressed }) => [
                    styles.methodBtn,
                    {
                      borderColor: active ? colors.gold : colors.border,
                      backgroundColor: active
                        ? "rgba(212,175,55,0.12)"
                        : colors.surface,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.methodIcon,
                      { backgroundColor: `${icon.tint}22` },
                    ]}
                  >
                    {icon.lib === "mcci" ? (
                      <MaterialCommunityIcons
                        name={icon.name as never}
                        size={18}
                        color={icon.tint}
                      />
                    ) : (
                      <Feather
                        name={icon.name as never}
                        size={18}
                        color={icon.tint}
                      />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.methodText,
                      { color: colors.foreground },
                    ]}
                    numberOfLines={1}
                  >
                    {t(METHOD_LABEL_KEY[m])}
                  </Text>
                  {active && (
                    <Feather name="check" size={14} color={colors.gold} />
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Payout summary */}
          <View
            style={[
              styles.payoutRow,
              {
                backgroundColor: "rgba(212,175,55,0.06)",
                borderColor: colors.border,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.rateLabel, { color: colors.mutedForeground }]}>
                {t("youReceive")}
              </Text>
              <Text style={[styles.payoutValue, { color: colors.gold }]}>
                {formatPayout(currency, payoutAmount)}
              </Text>
              <Text style={[styles.payoutSub, { color: colors.mutedForeground }]}>
                {formatNumber(MIN_WITHDRAW, language)} {t("coins")}
              </Text>
            </View>
            <View
              style={[styles.payoutBadge, { borderColor: colors.gold }]}
            >
              <MaterialCommunityIcons
                name="bank-transfer"
                size={22}
                color={colors.gold}
              />
            </View>
          </View>

          <Pressable
            onPress={onWithdrawPress}
            style={({ pressed }) => [
              styles.withdrawWrap,
              { opacity: canWithdraw ? (pressed ? 0.9 : 1) : 0.55 },
            ]}
            testID="withdraw-button"
          >
            <LinearGradient
              colors={
                canWithdraw
                  ? ["#FFD86B", "#D4AF37", "#8C6F1B"]
                  : ["#3A3245", "#2A2335"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.withdraw}
            >
              <Feather
                name="arrow-up-right"
                size={18}
                color={canWithdraw ? "#0B0B14" : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.withdrawText,
                  {
                    color: canWithdraw ? "#0B0B14" : colors.mutedForeground,
                  },
                ]}
              >
                {t("withdraw")} ·{" "}
                {canWithdraw
                  ? formatPayout(currency, payoutAmount)
                  : `${t("minimumWithdraw")} ${formatNumber(MIN_WITHDRAW, language)}`}
              </Text>
            </LinearGradient>
          </Pressable>

          <Text style={[styles.minNote, { color: colors.mutedForeground }]}>
            {t("minimumWithdraw")}: {formatNumber(MIN_WITHDRAW, language)}{" "}
            {t("coins")} ={" "}
            {currency === "BDT"
              ? `৳${formatNumber(Math.round(coinsToBdt(MIN_WITHDRAW)), language)}`
              : `$${coinsToUsd(MIN_WITHDRAW).toFixed(2)}`}
          </Text>
          {!canWithdraw && (
            <Text style={[styles.warnNote, { color: colors.destructive }]}>
              {t("insufficientBalance")}
            </Text>
          )}
        </View>

        <AdBanner />

        {/* Transactions */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle2, { color: colors.foreground }]}>
            {t("transactionHistory")}
          </Text>
          <MaterialCommunityIcons
            name="history"
            size={18}
            color={colors.mutedForeground}
          />
        </View>

        {transactions.length === 0 ? (
          <View style={[styles.emptyTx, { borderColor: colors.border }]}>
            <Feather name="inbox" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyTxText, { color: colors.mutedForeground }]}>
              {t("noTransactions")}
            </Text>
          </View>
        ) : (
          <View style={styles.txList}>
            {transactions.map((tx) => (
              <TxRow key={tx.id} tx={tx} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Confirm withdraw */}
      <Modal
        visible={confirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmVisible(false)}
      >
        <View style={styles.backdrop}>
          <View
            style={[
              styles.modal,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={[styles.modalIcon, { borderColor: colors.gold }]}>
              <Feather name="arrow-up-right" size={28} color={colors.gold} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {t("withdraw")}
            </Text>
            <Text style={[styles.modalAmount, { color: colors.gold }]}>
              {formatPayout(currency, payoutAmount)}
            </Text>
            <Text style={[styles.modalBody, { color: colors.mutedForeground }]}>
              {formatNumber(MIN_WITHDRAW, language)} {t("coins")} ·{" "}
              {t(METHOD_LABEL_KEY[method])}
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setConfirmVisible(false)}
                style={({ pressed }) => [
                  styles.modalBtnGhost,
                  {
                    borderColor: colors.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text
                  style={[styles.modalBtnGhostText, { color: colors.foreground }]}
                >
                  {t("close")}
                </Text>
              </Pressable>
              <Pressable
                onPress={confirmWithdraw}
                style={({ pressed }) => [
                  styles.modalBtnPrimary,
                  {
                    backgroundColor: colors.gold,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={styles.modalBtnPrimaryText}>{t("withdraw")}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success */}
      <Modal
        visible={successVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSuccessVisible(false)}
      >
        <View style={styles.backdrop}>
          <View
            style={[
              styles.modal,
              { backgroundColor: colors.card, borderColor: colors.gold },
            ]}
          >
            <View
              style={[
                styles.modalIcon,
                { borderColor: colors.gold, backgroundColor: "#2A210F" },
              ]}
            >
              <Feather name="check" size={28} color={colors.gold} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {t("withdrawalRequested")}
            </Text>
            {lastPayout && (
              <Text style={[styles.modalAmount, { color: colors.gold }]}>
                {formatPayout(lastPayout.currency, lastPayout.amount)}
              </Text>
            )}
            <Text style={[styles.modalBody, { color: colors.mutedForeground }]}>
              {t("withdrawalSuccess")}
            </Text>
            <Pressable
              onPress={() => setSuccessVisible(false)}
              style={({ pressed }) => [
                styles.modalBtnPrimary,
                {
                  backgroundColor: colors.gold,
                  opacity: pressed ? 0.85 : 1,
                  marginTop: 18,
                  width: "100%",
                },
              ]}
            >
              <Text style={styles.modalBtnPrimaryText}>{t("close")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function TxRow({ tx }: { tx: Transaction }) {
  const colors = useColors();
  const { t, language } = useApp();
  const isPositive = tx.amount > 0;
  const labelMap = {
    spin: t("earnedFromSpin"),
    scratch: t("earnedFromScratch"),
    ad: t("earnedFromAd"),
    withdraw: t("withdrawnAmount"),
    bonus: t("dailyBonus"),
    invite: t("earnedFromInvite"),
  } as const;
  const iconMap = {
    spin: "rotate-360",
    scratch: "card-bulleted-outline",
    ad: "play-circle",
    withdraw: "arrow-up-right",
    bonus: "gift",
    invite: "account-multiple-plus",
  } as const;

  const date = new Date(tx.timestamp);
  const dateStr = date.toLocaleDateString(
    language === "bn" ? "bn-BD" : "en-US",
    {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );

  const meta = tx.meta;
  const subText =
    tx.type === "withdraw" && meta?.payout != null && meta.currency
      ? meta.currency === "BDT"
        ? `৳${formatNumber(Math.round(meta.payout), language)} ${t("bdt")}${meta.method ? " · " + t(METHOD_LABEL_KEY[meta.method]) : ""}`
        : `$${meta.payout.toFixed(2)} ${t("usd")}${meta.method ? " · " + t(METHOD_LABEL_KEY[meta.method]) : ""}`
      : dateStr;

  return (
    <View
      style={[
        styles.txRow,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View
        style={[
          styles.txIcon,
          {
            backgroundColor: isPositive ? "#1F1A0E" : colors.muted,
            borderColor: isPositive ? colors.gold : colors.border,
          },
        ]}
      >
        <MaterialCommunityIcons
          name={iconMap[tx.type] as never}
          size={18}
          color={isPositive ? colors.gold : colors.mutedForeground}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.txLabel, { color: colors.foreground }]}>
          {labelMap[tx.type]}
        </Text>
        <Text style={[styles.txDate, { color: colors.mutedForeground }]}>
          {subText}
        </Text>
      </View>
      <Text
        style={[
          styles.txAmount,
          { color: isPositive ? colors.gold : colors.destructive },
        ]}
      >
        {isPositive ? "+" : ""}
        {formatNumber(tx.amount, language)}
      </Text>
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
  card: {
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 22,
  },
  cardLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  coinIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  coinGlyph: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: "#0B0B14",
  },
  amount: {
    fontFamily: "Inter_700Bold",
    fontSize: 42,
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
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 16,
  },
  statsRow: { flexDirection: "row", alignItems: "center" },
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
  section: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    gap: 8,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    letterSpacing: -0.2,
  },
  sublabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginTop: 4,
  },
  segmentWrap: {
    flexDirection: "row",
    borderRadius: 999,
    borderWidth: 1,
    padding: 4,
    marginTop: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
  },
  segmentText: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    letterSpacing: 0.3,
  },
  rateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  rateLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  rateValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    marginTop: 2,
  },
  methodsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  methodBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  methodIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  methodText: {
    flex: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  payoutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 14,
  },
  payoutValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    letterSpacing: -0.4,
    marginTop: 2,
  },
  payoutSub: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  payoutBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  withdrawWrap: {
    marginTop: 14,
    borderRadius: 999,
    shadowColor: "#D4AF37",
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  withdraw: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 999,
  },
  withdrawText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    letterSpacing: 0.3,
    textAlign: "center",
  },
  minNote: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    textAlign: "center",
    marginTop: 10,
    letterSpacing: 0.3,
  },
  warnNote: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle2: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    letterSpacing: -0.2,
  },
  emptyTx: {
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    padding: 30,
    alignItems: "center",
    gap: 8,
  },
  emptyTxText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  txList: { gap: 8 },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  txLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  txDate: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 2,
  },
  txAmount: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.78)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modal: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 24,
    alignItems: "center",
    gap: 6,
  },
  modalIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  modalTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    textAlign: "center",
  },
  modalAmount: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    letterSpacing: -0.6,
    marginTop: 4,
  },
  modalBody: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    textAlign: "center",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
    width: "100%",
  },
  modalBtnGhost: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
  },
  modalBtnGhostText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  modalBtnPrimary: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 999,
    alignItems: "center",
  },
  modalBtnPrimaryText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: "#0B0B14",
    letterSpacing: 0.3,
  },
});
