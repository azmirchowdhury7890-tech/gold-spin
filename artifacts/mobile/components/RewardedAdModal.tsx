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
  duration?: number; // seconds, default 5
  title: string;
  body: string;
  rewardLabel: string;
  ctaLabel?: string;
  onCompleted: () => void | Promise<void>;
};

export function RewardedAdModal({
  visible,
  onClose,
  duration = 5,
  title,
  body,
  rewardLabel,
  ctaLabel,
  onCompleted,
}: Props) {
  const colors = useColors();
  const { t, language } = useApp();
  const [phase, setPhase] = useState<"intro" | "playing" | "done">("intro");
  const [seconds, setSeconds] = useState(duration);

  useEffect(() => {
    if (!visible) {
      setPhase("intro");
      setSeconds(duration);
    }
  }, [visible, duration]);

  useEffect(() => {
    if (phase !== "playing") return;
    if (seconds <= 0) {
      setPhase("done");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        ).catch(() => {});
      }
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
    setSeconds(duration);
  };

  const claim = async () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => {});
    }
    await onCompleted();
    onClose();
  };

  const progress = duration > 0 ? 1 - seconds / duration : 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Pressable
            onPress={onClose}
            style={[
              styles.closeBtn,
              { backgroundColor: colors.surfaceElevated },
            ]}
            accessibilityLabel="Close"
            disabled={phase === "playing"}
          >
            <Feather
              name="x"
              size={18}
              color={
                phase === "playing"
                  ? colors.mutedForeground
                  : colors.foreground
              }
            />
          </Pressable>

          <LinearGradient colors={["#2A210F", "#1B1B28"]} style={styles.adArea}>
            {phase === "intro" ? (
              <>
                <View style={[styles.iconBig, { borderColor: colors.gold }]}>
                  <Feather name="play" size={36} color={colors.gold} />
                </View>
                <Text style={[styles.titleBig, { color: colors.foreground }]}>
                  {title}
                </Text>
                <Text style={[styles.body, { color: colors.mutedForeground }]}>
                  {body}
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
                <View
                  style={[
                    styles.progressBg,
                    { backgroundColor: "rgba(255,255,255,0.08)" },
                  ]}
                >
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: colors.gold,
                        width: `${progress * 100}%`,
                      },
                    ]}
                  />
                </View>
              </>
            ) : (
              <>
                <View
                  style={[
                    styles.iconBig,
                    {
                      borderColor: colors.gold,
                      backgroundColor: "#2A210F",
                    },
                  ]}
                >
                  <Feather name="award" size={36} color={colors.gold} />
                </View>
                <Text style={[styles.titleBig, { color: colors.foreground }]}>
                  {t("congratulations")}
                </Text>
                <Text style={[styles.body, { color: colors.gold }]}>
                  {rewardLabel}
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
                  {
                    backgroundColor: colors.gold,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Feather name="play-circle" size={18} color="#0B0B14" />
                <Text style={styles.ctaText}>
                  {ctaLabel ?? t("watchAd")}
                </Text>
              </Pressable>
            ) : phase === "done" ? (
              <Pressable
                onPress={claim}
                style={({ pressed }) => [
                  styles.cta,
                  {
                    backgroundColor: colors.gold,
                    opacity: pressed ? 0.85 : 1,
                  },
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
  progressBg: {
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
    width: "80%",
    marginTop: 4,
  },
  progressFill: {
    height: 6,
    borderRadius: 999,
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
