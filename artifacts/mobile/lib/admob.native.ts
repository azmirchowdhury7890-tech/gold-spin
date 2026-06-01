/**
 * Native (Android / iOS) AdMob rewarded ad implementation.
 * Metro picks this file over admob.ts on native platforms.
 */
import {
  AdEventType,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from "react-native-google-mobile-ads";

export const ADMOB_APP_ID = "ca-app-pub-7881337382187672~4367734386";
export const REWARDED_AD_UNIT_ID =
  "ca-app-pub-7881337382187672/7820798191";
export const AD_COIN_REWARD = 500;

export type ShowResult = "rewarded" | "closed_early" | "unavailable" | "error";

const unitId = __DEV__ ? TestIds.REWARDED : REWARDED_AD_UNIT_ID;

/**
 * Load a new rewarded ad and immediately show it once ready.
 * Resolves to:
 *   "rewarded"      — user watched in full → grant the reward
 *   "closed_early"  — user dismissed before earning → no reward
 *   "unavailable"   — (not returned from native; kept for API parity)
 *   "error"         — load / show error
 */
export function showRewardedAd(): Promise<ShowResult> {
  return new Promise<ShowResult>((resolve) => {
    let earned = false;
    let settled = false;

    const settle = (result: ShowResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    try {
      const ad = RewardedAd.createForAdRequest(unitId, {
        requestNonPersonalizedAdsOnly: false,
      });

      const unsubLoad = ad.addAdEventListener(
        RewardedAdEventType.LOADED,
        () => {
          unsubLoad();
          try {
            ad.show();
          } catch {
            settle("error");
          }
        },
      );

      ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        earned = true;
      });

      ad.addAdEventListener(AdEventType.CLOSED, () => {
        settle(earned ? "rewarded" : "closed_early");
      });

      ad.addAdEventListener(AdEventType.ERROR, () => {
        settle("error");
      });

      ad.load();
    } catch {
      settle("error");
    }
  });
}
