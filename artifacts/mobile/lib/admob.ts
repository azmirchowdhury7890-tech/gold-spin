/**
 * Web stub for AdMob — always returns "unavailable" so callers fall back to
 * the simulated RewardedAdModal. Metro uses admob.native.ts on Android/iOS.
 */

export const ADMOB_APP_ID = "ca-app-pub-7881337382187672~4367734386";
export const REWARDED_AD_UNIT_ID =
  "ca-app-pub-7881337382187672/7820798191";
export const BANNER_AD_UNIT_ID =
  "ca-app-pub-7881337382187672/1927823209";
export const AD_COIN_REWARD = 500;

export type ShowResult = "rewarded" | "closed_early" | "unavailable" | "error";

export function showRewardedAd(): Promise<ShowResult> {
  return Promise.resolve("unavailable");
}
