/**
 * Native (Android / iOS) AdBanner — shows a real AdMob banner ad.
 * Metro picks this file over AdBanner.tsx on native platforms.
 */
import { BannerAd, BannerAdSize, TestIds } from "react-native-google-mobile-ads";
import React, { useState } from "react";
import { View, StyleSheet } from "react-native";

const BANNER_AD_UNIT_ID = __DEV__
  ? TestIds.BANNER
  : "ca-app-pub-7881337382187672/1927823209";

export function AdBanner() {
  const [loaded, setLoaded] = useState(false);

  return (
    <View style={[styles.wrap, loaded && styles.loaded]}>
      <BannerAd
        unitId={BANNER_AD_UNIT_ID}
        size={BannerAdSize.BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
        onAdLoaded={() => setLoaded(true)}
        onAdFailedToLoad={() => setLoaded(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    minHeight: 0,
    overflow: "hidden",
  },
  loaded: {
    minHeight: 50,
  },
});
