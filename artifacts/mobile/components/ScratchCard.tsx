import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";

import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import { formatNumber } from "@/i18n/translations";

type Props = {
  reward: number;
  cardKey: string | number;
  onRevealed: (reward: number) => void;
};

const REVEAL_THRESHOLD = 0.45;
const COLS = 8;
const ROWS = 8;

export function ScratchCard({ reward, cardKey, onRevealed }: Props) {
  const colors = useColors();
  const { language, t } = useApp();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [revealedCells, setRevealedCells] = useState<Set<number>>(
    () => new Set(),
  );
  const [isRevealed, setIsRevealed] = useState(false);
  const cellRefs = useRef<Set<number>>(new Set());

  const rewardScale = useRef(new Animated.Value(0.6)).current;
  const rewardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    cellRefs.current = new Set();
    setRevealedCells(new Set());
    setIsRevealed(false);
    rewardScale.setValue(0.6);
    rewardOpacity.setValue(0);
  }, [cardKey, rewardScale, rewardOpacity]);

  const triggerReveal = () => {
    if (isRevealed) return;
    setIsRevealed(true);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
    }
    Animated.parallel([
      Animated.spring(rewardScale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(rewardOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
    onRevealed(reward);
    const all = new Set<number>();
    for (let i = 0; i < COLS * ROWS; i++) all.add(i);
    cellRefs.current = all;
    setRevealedCells(all);
  };

  const handleAt = (locationX: number, locationY: number) => {
    if (size.width === 0 || size.height === 0 || isRevealed) return;
    const cellW = size.width / COLS;
    const cellH = size.height / ROWS;
    const c = Math.max(0, Math.min(COLS - 1, Math.floor(locationX / cellW)));
    const r = Math.max(0, Math.min(ROWS - 1, Math.floor(locationY / cellH)));
    let added = false;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr;
        const cc = c + dc;
        if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) continue;
        const idx = rr * COLS + cc;
        if (!cellRefs.current.has(idx)) {
          cellRefs.current.add(idx);
          added = true;
        }
      }
    }
    if (added) {
      setRevealedCells(new Set(cellRefs.current));
      const ratio = cellRefs.current.size / (COLS * ROWS);
      if (ratio >= REVEAL_THRESHOLD) {
        triggerReveal();
      }
    }
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !isRevealed,
        onMoveShouldSetPanResponder: () => !isRevealed,
        onPanResponderGrant: (e) => {
          handleAt(e.nativeEvent.locationX, e.nativeEvent.locationY);
        },
        onPanResponderMove: (e) => {
          handleAt(e.nativeEvent.locationX, e.nativeEvent.locationY);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [size.width, size.height, isRevealed, cardKey],
  );

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };

  const cellW = size.width > 0 ? size.width / COLS : 0;
  const cellH = size.height > 0 ? size.height / ROWS : 0;

  return (
    <View
      style={[
        styles.wrap,
        { borderColor: colors.gold, backgroundColor: colors.surface },
      ]}
      onLayout={onLayout}
      {...responder.panHandlers}
    >
      <LinearGradient
        colors={["#1F1A0E", "#2A210F"]}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View
        style={[
          styles.center,
          { transform: [{ scale: rewardScale }], opacity: rewardOpacity },
        ]}
      >
        <View style={[styles.coinBig, { borderColor: colors.gold }]}>
          <Text style={[styles.coinSign, { color: colors.gold }]}>৳</Text>
        </View>
        <Text style={[styles.rewardValue, { color: colors.gold }]}>
          {formatNumber(reward, language)}
        </Text>
        <Text style={[styles.rewardLabel, { color: colors.foreground }]}>
          {t("youWon")}
        </Text>
      </Animated.View>

      {size.width > 0 && !isRevealed && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {Array.from({ length: ROWS * COLS }).map((_, idx) => {
            if (revealedCells.has(idx)) return null;
            const r = Math.floor(idx / COLS);
            const c = idx % COLS;
            return (
              <LinearGradient
                key={`cell${idx}`}
                colors={["#2A2335", "#15101F"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  position: "absolute",
                  left: c * cellW,
                  top: r * cellH,
                  width: cellW + 0.6,
                  height: cellH + 0.6,
                  borderRightWidth: 0.5,
                  borderBottomWidth: 0.5,
                  borderColor: "rgba(0,0,0,0.35)",
                }}
              />
            );
          })}
          <View style={styles.hintWrap}>
            <Feather name="chevrons-right" size={18} color={colors.gold} />
            <Text style={[styles.hint, { color: colors.foreground }]}>
              {t("swipeToScratch")}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 20,
  },
  coinBig: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  coinSign: {
    fontFamily: "Inter_700Bold",
    fontSize: 32,
  },
  rewardValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 44,
    letterSpacing: -1,
  },
  rewardLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    opacity: 0.85,
  },
  hintWrap: {
    position: "absolute",
    bottom: 18,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  hint: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    letterSpacing: 0.3,
  },
});
