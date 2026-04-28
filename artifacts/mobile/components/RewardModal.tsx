import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import { formatNumber } from "@/i18n/translations";

type Props = {
  visible: boolean;
  reward: number;
  onClose: () => void;
};

export function RewardModal({ visible, reward, onClose }: Props) {
  const colors = useColors();
  const { language, t } = useApp();
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scale.setValue(0.6);
      opacity.setValue(0);
    }
  }, [visible, scale, opacity]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.gold,
              transform: [{ scale }],
              opacity,
            },
          ]}
        >
          <LinearGradient
            colors={["#2A210F", "#15151F"]}
            style={styles.header}
          >
            <View style={[styles.iconBig, { borderColor: colors.gold }]}>
              <Feather name="award" size={42} color={colors.gold} />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {t("congratulations")}
            </Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>
              {t("youWon")}
            </Text>
            <Text style={[styles.amount, { color: colors.gold }]}>
              +{formatNumber(reward, language)}
            </Text>
            <Text style={[styles.coinLabel, { color: colors.mutedForeground }]}>
              {t("coins")}
            </Text>
          </LinearGradient>
          <View style={styles.footer}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.cta,
                { backgroundColor: colors.gold, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={styles.ctaText}>{t("claim")}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.78)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  header: {
    alignItems: "center",
    padding: 28,
    gap: 8,
  },
  iconBig: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    letterSpacing: -0.4,
    textAlign: "center",
  },
  body: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 6,
  },
  amount: {
    fontFamily: "Inter_700Bold",
    fontSize: 56,
    letterSpacing: -1,
    marginTop: 2,
  },
  coinLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  footer: {
    padding: 16,
  },
  cta: {
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
  },
  ctaText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: "#0B0B14",
    letterSpacing: 0.4,
  },
});
