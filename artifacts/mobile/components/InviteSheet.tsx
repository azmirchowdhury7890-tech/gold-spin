import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { INVITE_REWARD, useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import { formatNumber } from "@/i18n/translations";

type Props = {
  visible: boolean;
  onClose: () => void;
};

type Notice =
  | { kind: "success"; text: string }
  | { kind: "error"; text: string }
  | null;

export function InviteSheet({ visible, onClose }: Props) {
  const colors = useColors();
  const {
    t,
    language,
    inviteCode,
    redeemedCode,
    invitesSent,
    inviteBonusEarned,
    redeemInviteCode,
    recordInviteSent,
  } = useApp();

  const [codeInput, setCodeInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);

  const onCopy = async () => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync().catch(() => {});
    }
    try {
      if (
        Platform.OS === "web" &&
        typeof navigator !== "undefined" &&
        navigator.clipboard?.writeText
      ) {
        await navigator.clipboard.writeText(inviteCode);
      }
    } catch {
      // best effort
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const onShare = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    const message = `${t("inviteShareMsg")}${inviteCode}`;
    try {
      if (
        Platform.OS === "web" &&
        typeof navigator !== "undefined" &&
        (navigator as Navigator & { share?: (data: ShareData) => Promise<void> })
          .share
      ) {
        await (
          navigator as Navigator & { share: (data: ShareData) => Promise<void> }
        ).share({
          title: t("invite"),
          text: message,
        });
      } else if (Platform.OS !== "web") {
        await Share.share({ message });
      } else {
        if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(message);
        }
      }
      // Mock the inviter-side reward (would happen via backend in production)
      await recordInviteSent();
      setNotice({
        kind: "success",
        text: `${t("inviteSuccess")} +${formatNumber(INVITE_REWARD, language)} ${t("coins")}`,
      });
      setTimeout(() => setNotice(null), 2400);
    } catch {
      // user cancelled share
    }
  };

  const onApply = async () => {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    const result = await redeemInviteCode(codeInput);
    setBusy(false);
    if (result.ok) {
      setCodeInput("");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        ).catch(() => {});
      }
      setNotice({
        kind: "success",
        text: `${t("inviteSuccess")} +${formatNumber(INVITE_REWARD, language)} ${t("coins")}`,
      });
    } else {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Error,
        ).catch(() => {});
      }
      const text =
        result.reason === "own"
          ? t("ownCodeError")
          : result.reason === "already"
            ? t("alreadyRedeemed")
            : t("invalidCode");
      setNotice({ kind: "error", text });
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {t("invite")}
            </Text>
            <Pressable
              onPress={onClose}
              style={[
                styles.closeBtn,
                { backgroundColor: colors.surfaceElevated },
              ]}
              accessibilityLabel="Close"
            >
              <Feather name="x" size={18} color={colors.foreground} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            {/* Code card */}
            <LinearGradient
              colors={["#2A210F", "#15151F"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.codeCard, { borderColor: colors.gold }]}
            >
              <View style={styles.codeTopRow}>
                <View
                  style={[styles.gemIcon, { borderColor: colors.gold }]}
                >
                  <MaterialCommunityIcons
                    name="gift"
                    size={22}
                    color={colors.gold}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.codeLabel,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {t("yourInviteCode")}
                  </Text>
                  <Text style={[styles.codeValue, { color: colors.gold }]}>
                    {inviteCode}
                  </Text>
                </View>
              </View>

              <View style={styles.codeActions}>
                <Pressable
                  onPress={onCopy}
                  style={({ pressed }) => [
                    styles.actionGhost,
                    {
                      borderColor: colors.gold,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Feather
                    name={copied ? "check" : "copy"}
                    size={15}
                    color={colors.gold}
                  />
                  <Text style={[styles.actionGhostText, { color: colors.gold }]}>
                    {copied ? t("copied") : t("copy")}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={onShare}
                  style={({ pressed }) => [
                    styles.actionPrimary,
                    {
                      backgroundColor: colors.gold,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Feather name="share-2" size={15} color="#0B0B14" />
                  <Text style={styles.actionPrimaryText}>{t("shareCode")}</Text>
                </Pressable>
              </View>

              <Text style={[styles.bothEarn, { color: colors.mutedForeground }]}>
                <Feather name="users" size={11} color={colors.mutedForeground} />
                {"  "}
                {t("inviteRewardEach")}
              </Text>
            </LinearGradient>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <View
                style={[
                  styles.statBox,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Feather name="user-plus" size={16} color={colors.gold} />
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {formatNumber(invitesSent, language)}
                </Text>
                <Text
                  style={[styles.statLabel, { color: colors.mutedForeground }]}
                >
                  {t("invitesSent")}
                </Text>
              </View>
              <View
                style={[
                  styles.statBox,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="treasure-chest"
                  size={18}
                  color={colors.gold}
                />
                <Text style={[styles.statValue, { color: colors.gold }]}>
                  +{formatNumber(inviteBonusEarned, language)}
                </Text>
                <Text
                  style={[styles.statLabel, { color: colors.mutedForeground }]}
                >
                  {t("bonusEarned")}
                </Text>
              </View>
            </View>

            {/* How it works */}
            <View
              style={[
                styles.section,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                {t("howItWorks")}
              </Text>
              {[t("step1"), t("step2"), t("step3")].map((step, i) => (
                <View key={i} style={styles.stepRow}>
                  <View
                    style={[styles.stepNum, { borderColor: colors.gold }]}
                  >
                    <Text style={[styles.stepNumText, { color: colors.gold }]}>
                      {formatNumber(i + 1, language)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.stepText,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {step}
                  </Text>
                </View>
              ))}
            </View>

            {/* Apply code */}
            <View
              style={[
                styles.section,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                {t("haveInviteCode")}
              </Text>
              {redeemedCode ? (
                <View
                  style={[
                    styles.redeemedBox,
                    {
                      backgroundColor: "rgba(212,175,55,0.10)",
                      borderColor: colors.gold,
                    },
                  ]}
                >
                  <Feather name="check-circle" size={18} color={colors.gold} />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.redeemedTitle,
                        { color: colors.foreground },
                      ]}
                    >
                      {t("alreadyRedeemed")}
                    </Text>
                    <Text
                      style={[
                        styles.redeemedCode,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {redeemedCode}
                    </Text>
                  </View>
                </View>
              ) : (
                <>
                  <View style={styles.inputRow}>
                    <TextInput
                      value={codeInput}
                      onChangeText={(v) =>
                        setCodeInput(v.toUpperCase().slice(0, 6))
                      }
                      placeholder={t("inviteCodePlaceholder")}
                      placeholderTextColor={colors.mutedForeground}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      maxLength={6}
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                          color: colors.foreground,
                        },
                      ]}
                    />
                    <Pressable
                      onPress={onApply}
                      disabled={busy || codeInput.length !== 6}
                      style={({ pressed }) => [
                        styles.applyBtn,
                        {
                          backgroundColor:
                            codeInput.length === 6 && !busy
                              ? colors.gold
                              : colors.muted,
                          opacity: pressed && codeInput.length === 6 ? 0.85 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.applyBtnText,
                          {
                            color:
                              codeInput.length === 6 && !busy
                                ? "#0B0B14"
                                : colors.mutedForeground,
                          },
                        ]}
                      >
                        {t("apply")}
                      </Text>
                    </Pressable>
                  </View>
                  {notice && (
                    <View
                      style={[
                        styles.notice,
                        {
                          backgroundColor:
                            notice.kind === "success"
                              ? "rgba(212,175,55,0.12)"
                              : "rgba(239,68,68,0.10)",
                          borderColor:
                            notice.kind === "success"
                              ? colors.gold
                              : colors.destructive,
                        },
                      ]}
                    >
                      <Feather
                        name={
                          notice.kind === "success" ? "check-circle" : "alert-circle"
                        }
                        size={14}
                        color={
                          notice.kind === "success"
                            ? colors.gold
                            : colors.destructive
                        }
                      />
                      <Text
                        style={[
                          styles.noticeText,
                          {
                            color:
                              notice.kind === "success"
                                ? colors.gold
                                : colors.destructive,
                          },
                        ]}
                      >
                        {notice.text}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    maxHeight: "90%",
    paddingBottom: 24,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignSelf: "center",
    marginTop: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    paddingHorizontal: 20,
    gap: 14,
  },
  codeCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 18,
    gap: 14,
  },
  codeTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  gemIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  codeLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  codeValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    letterSpacing: 4,
    marginTop: 2,
  },
  codeActions: {
    flexDirection: "row",
    gap: 10,
  },
  actionGhost: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  actionGhostText: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    letterSpacing: 0.3,
  },
  actionPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 999,
  },
  actionPrimaryText: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: "#0B0B14",
    letterSpacing: 0.3,
  },
  bothEarn: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statBox: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: "flex-start",
    gap: 6,
  },
  statValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    letterSpacing: -0.2,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },
  stepText: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 18,
  },
  inputRow: {
    flexDirection: "row",
    gap: 8,
  },
  input: {
    flex: 1,
    height: 46,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    letterSpacing: 3,
  },
  applyBtn: {
    height: 46,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  applyBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    letterSpacing: 0.3,
  },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  noticeText: {
    flex: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  redeemedBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  redeemedTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  redeemedCode: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    letterSpacing: 2,
    marginTop: 2,
  },
});
