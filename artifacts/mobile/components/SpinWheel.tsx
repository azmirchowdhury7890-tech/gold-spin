import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useImperativeHandle, useRef, forwardRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import Svg, {
  Defs,
  G,
  Path,
  RadialGradient,
  Stop,
  Circle,
  Text as SvgText,
  LinearGradient as SvgLinearGradient,
} from "react-native-svg";

import { useColors } from "@/hooks/useColors";
import { formatNumber, type Language } from "@/i18n/translations";

export type WheelSegment = {
  label: string;
  value: number;
  color: string;
};

type Props = {
  size: number;
  segments: WheelSegment[];
  language: Language;
};

export type SpinWheelHandle = {
  spinTo: (segmentIndex: number, onDone?: () => void) => void;
};

export const SpinWheel = forwardRef<SpinWheelHandle, Props>(function SpinWheel(
  { size, segments, language },
  ref,
) {
  const colors = useColors();
  const rotation = useRef(new Animated.Value(0)).current;
  const tilt = useRef(new Animated.Value(0)).current;
  const totalRotationsRef = useRef(0);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(tilt, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(tilt, {
          toValue: 0,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [tilt]);

  useImperativeHandle(ref, () => ({
    spinTo: (segmentIndex: number, onDone?: () => void) => {
      const segCount = segments.length;
      const segAngle = 360 / segCount;
      // Pointer is at top (12 o'clock). Each segment center sits at:
      // segCenter = i * segAngle + segAngle/2 (measured clockwise from top of unrotated wheel)
      // We need rotation R such that (segCenter + R) mod 360 === 0  ->  R = -(segCenter)
      const targetSegmentCenter = segmentIndex * segAngle + segAngle / 2;
      const targetMod = (360 - targetSegmentCenter) % 360;
      const fullSpins = 6;
      const currentMod = totalRotationsRef.current % 360;
      let delta = targetMod - currentMod;
      if (delta < 0) delta += 360;
      const finalRotation =
        totalRotationsRef.current + 360 * fullSpins + delta;

      Animated.timing(rotation, {
        toValue: finalRotation,
        duration: 4200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        totalRotationsRef.current = finalRotation;
        onDone?.();
      });
    },
  }));

  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 6;
  const segAngle = (2 * Math.PI) / segments.length;

  const polar = (angle: number, r: number) => ({
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  });

  const rotateInterp = rotation.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "360deg"],
  });

  const tiltInterp = tilt.interpolate({
    inputRange: [0, 1],
    outputRange: ["-3deg", "3deg"],
  });

  return (
    <View style={[styles.outer, { width: size + 24, height: size + 24 }]}>
      {/* Outer glow */}
      <View
        style={[
          styles.glow,
          {
            width: size + 24,
            height: size + 24,
            borderRadius: (size + 24) / 2,
            shadowColor: colors.gold,
          },
        ]}
      />

      <Animated.View
        style={{
          width: size + 24,
          height: size + 24,
          transform: [{ perspective: 1000 }, { rotateX: tiltInterp }],
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Decorative ring with light dots */}
        <View
          style={[
            styles.ring,
            { width: size + 18, height: size + 18, borderColor: colors.gold },
          ]}
        >
          <Svg width={size + 18} height={size + 18}>
            <Defs>
              <RadialGradient id="ringGrad" cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0%" stopColor="#3A2E10" stopOpacity="0" />
                <Stop offset="100%" stopColor="#0B0B14" stopOpacity="1" />
              </RadialGradient>
            </Defs>
            <Circle
              cx={(size + 18) / 2}
              cy={(size + 18) / 2}
              r={(size + 18) / 2 - 1}
              fill="url(#ringGrad)"
            />
            {Array.from({ length: 24 }).map((_, i) => {
              const a = (i / 24) * 2 * Math.PI - Math.PI / 2;
              const r = (size + 18) / 2 - 8;
              const x = (size + 18) / 2 + r * Math.cos(a);
              const y = (size + 18) / 2 + r * Math.sin(a);
              return (
                <Circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={2.2}
                  fill={i % 2 === 0 ? "#FFD86B" : "#8C6F1B"}
                />
              );
            })}
          </Svg>
        </View>

        {/* Spinning wheel */}
        <Animated.View
          style={{
            position: "absolute",
            width: size,
            height: size,
            transform: [{ rotate: rotateInterp }],
          }}
        >
          <Svg width={size} height={size}>
            <Defs>
              <RadialGradient id="wheelShade" cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="60%" stopColor="#000000" stopOpacity="0" />
                <Stop offset="100%" stopColor="#000000" stopOpacity="0.45" />
              </RadialGradient>
              {segments.map((s, i) => (
                <SvgLinearGradient
                  key={`g${i}`}
                  id={`seg${i}`}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <Stop offset="0%" stopColor={s.color} stopOpacity="1" />
                  <Stop offset="100%" stopColor={s.color} stopOpacity="0.78" />
                </SvgLinearGradient>
              ))}
            </Defs>

            {segments.map((seg, i) => {
              // Segment i occupies angles from (i*segAngle) to ((i+1)*segAngle),
              // measured clockwise from the top (12 o'clock).
              // In SVG coords, top corresponds to angle = -PI/2.
              const startAngle = i * segAngle - Math.PI / 2;
              const endAngle = (i + 1) * segAngle - Math.PI / 2;
              const p1 = polar(startAngle, radius);
              const p2 = polar(endAngle, radius);
              const largeArc = segAngle > Math.PI ? 1 : 0;
              const d = `M ${cx} ${cy} L ${p1.x} ${p1.y} A ${radius} ${radius} 0 ${largeArc} 1 ${p2.x} ${p2.y} Z`;

              const midAngle = startAngle + segAngle / 2;
              const labelR = radius * 0.62;
              const lp = polar(midAngle, labelR);
              const labelRotateDeg =
                ((midAngle + Math.PI / 2) * 180) / Math.PI;

              return (
                <G key={i}>
                  <Path d={d} fill={`url(#seg${i})`} stroke="#0B0B14" strokeWidth={2} />
                  <G
                    transform={`rotate(${labelRotateDeg}, ${lp.x}, ${lp.y})`}
                  >
                    <SvgText
                      x={lp.x}
                      y={lp.y + 4}
                      fontSize={radius * 0.16}
                      fontWeight="bold"
                      fill="#0B0B14"
                      textAnchor="middle"
                    >
                      {formatNumber(seg.value, language)}
                    </SvgText>
                  </G>
                </G>
              );
            })}

            <Circle cx={cx} cy={cy} r={radius} fill="url(#wheelShade)" />
            {/* Hub */}
            <Circle cx={cx} cy={cy} r={radius * 0.18} fill="#0B0B14" />
            <Circle cx={cx} cy={cy} r={radius * 0.18} fill="none" stroke="#D4AF37" strokeWidth={2} />
            <Circle cx={cx} cy={cy} r={radius * 0.08} fill="#D4AF37" />
          </Svg>
        </Animated.View>

        {/* Pointer */}
        <View style={[styles.pointerWrap, { top: 0 }]}>
          <LinearGradient
            colors={["#FFD86B", "#8C6F1B"]}
            style={styles.pointer}
          />
          <View style={styles.pointerDot} />
        </View>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  outer: {
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    shadowOpacity: 0.5,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  ring: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  pointerWrap: {
    position: "absolute",
    alignItems: "center",
    width: 26,
  },
  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 13,
    borderRightWidth: 13,
    borderTopWidth: 24,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#FFD86B",
  },
  pointerDot: {
    position: "absolute",
    top: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#D4AF37",
    borderWidth: 2,
    borderColor: "#0B0B14",
  },
});
