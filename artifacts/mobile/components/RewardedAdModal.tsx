import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import { formatNumber } from "@/i18n/translations";

type Props = {
  visible: boolean;
  onClose: () => void;
  reward: number;
  onClaimed: () => void;
};

export function RewardedAdModal({ visible, onClose, reward, onClaimed }: Props) {
  const colors = useColors();
  const { t, language, claimAdReward } = useApp();
  const [phase, setPhase] = useState<"intro" | "playing" | "done">("intro");
  const [seconds, setSeconds] = useState(5);

  useEffect(() => {
    if (!visible) {
      setPhase("intro");
      setSeconds(5);
    }
  }, [visible]);

  useEffect(() => {
    if (phase !== "playing") return;
    if (seconds <= 0) {
      setPhase("done");
      return;
    }
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, seconds]);

  const start = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    setPhase("playing");
    setSeconds(5);
  };

  const claim = async () => {
    const ok = await claimAdReward(reward);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
    }
    if (ok) onClaimed();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Pressable
            onPress={onClose}
            style={[styles.closeBtn, { backgroundColor: colors.surfaceElevated }]}
            accessibilityLabel="Close"
          >
            <Feather name="x" size={18} color={colors.foreground} />
          </Pressable>

          <LinearGradient
            colors={["#2A210F", "#1B1B28"]}
            style={styles.adArea}
          >
            {phase === "intro" ? (
              <>
                <View style={[styles.iconBig, { borderColor: colors.gold }]}>
                  <Feather name="play" size={36} color={colors.gold} />
                </View>
                <Text style={[styles.titleBig, { color: colors.foreground }]}>
                  {t("rewardedAdTitle")}
                </Text>
                <Text style={[styles.body, { color: colors.mutedForeground }]}>
                  {t("rewardedAdBody")}
                </Text>
              </>
            ) : phase === "playing" ? (
              <>
                <ActivityIndicator size="large" color={colors.gold} />
                <Text style={[styles.titleBig, { color: colors.foreground }]}>
                  {t("sponsoredAd")}
                </Text>
                <Text style={[styles.body, { color: colors.mutedForeground }]}>
                  {formatNumber(seconds, language)}s
                </Text>
              </>
            ) : (
              <>
                <View style={[styles.iconBig, { borderColor: colors.gold, backgroundColor: "#2A210F" }]}>
                  <Feather name="check" size={36} color={colors.gold} />
                </View>
                <Text style={[styles.titleBig, { color: colors.foreground }]}>
                  {t("congratulations")}
                </Text>
                <Text style={[styles.body, { color: colors.gold }]}>
                  +{formatNumber(reward, language)} {t("coins")}
                </Text>
              </>
            )}
          </LinearGradient>

          <View style={styles.footer}>
            {phase === "intro" ? (
              <Pressable
                onPress={start}
                style={({ pressed }) => [
                  styles.cta,
                  { backgroundColor: colors.gold, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Feather name="play-circle" size={18} color="#0B0B14" />
                <Text style={styles.ctaText}>
                  {t("watchAd")} · +{formatNumber(reward, language)}
                </Text>
              </Pressable>
            ) : phase === "done" ? (
              <Pressable
                onPress={claim}
                style={({ pressed }) => [
                  styles.cta,
                  { backgroundColor: colors.gold, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Feather name="award" size={18} color="#0B0B14" />
                <Text style={styles.ctaText}>{t("claim")}</Text>
              </Pressable>
            ) : (
              <Text style={[styles.body, { color: colors.mutedForeground }]}>
                {t("sponsoredAd")}
              </Text>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  closeBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  adArea: {
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 14,
  },
  iconBig: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  titleBig: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    textAlign: "center",
  },
  body: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    textAlign: "center",
  },
  footer: {
    padding: 16,
    alignItems: "center",
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 999,
    width: "100%",
  },
  ctaText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: "#0B0B14",
    letterSpacing: 0.3,
  },
});
