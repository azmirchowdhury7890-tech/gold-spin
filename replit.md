# Goldspin — Bengali/English Rewards App

A premium dark-gold themed mobile rewards app (Expo + React Native) with bilingual UI (English / বাংলা), dual-currency withdrawals, and a watch-ad-to-spin loop.

## Features

- **Bilingual** — full EN/BN translation with toggle in the top header. Numbers also localize to Bengali digits.
- **Home** — balance card with **BDT and USD equivalent pills**, daily streak, today's earnings, daily-spins-left chip, quick actions, daily task checklist (spin, scratch, watch ad), tappable invite friends card (opens referral sheet), banner ad placeholder.
- **Referral / Invite** — each player gets a unique 6-character invite code (auto-generated and persisted). Bottom-sheet UI with: big gold code display, **Copy** + **Share Code** buttons (uses native Share API on mobile, Web Share / clipboard on web), live stats for invites sent and bonus earned, a "How it works" 3-step explainer, and an **Apply code** input that validates format, blocks the user's own code, and prevents double-redeeming. Both sides earn **100 coins** when a friend joins.
- **Spin & Win** — 3D-style gold wheel with 8 reward segments (5–100 coins), animated easing, **5 free spins/day**. After free spins are used the button switches to **"Watch Ad to Spin"** (orange gradient + gift icon) and a 15s rewarded ad grants 1 bonus spin. The header shows `Free Spins Left: X` and a `Watch Ad for More` hint when needed; bonus spins are tracked separately.
- **Scratch & Win** — swipe-to-reveal scratch card, 8×8 cell grid, 45% reveal threshold, reward range 10–200 coins, 5 cards/day.
- **Wallet — multi-currency withdraw** —
  - Currency toggle: **BDT** (1,000 Coins = ৳1) / **USD** (1,000 Coins = $0.0085)
  - Methods auto-update by currency: **BDT → bKash, Nagad** · **USD → Binance (USDT), PayPal** (each with brand-tinted icon)
  - Exchange-rate row, "You Receive" payout summary, confirm + success modals showing the actual currency payout
  - Min withdraw: **100,000 Coins** (= ৳100 / ~$0.85)
  - Transaction history rows display the payout currency + method for each withdrawal
- **Persistence** — language, coins, daily counts (free + bonus spins), streak, and transaction history all stored in AsyncStorage. Daily counters reset based on local date.
- **Ads** — banner placeholder on every screen + a generic rewarded video modal used for both the daily 50-coin ad (5s) and the watch-ad-to-spin reward (15s).

## Stack

- Expo SDK 54 + Expo Router (file-based routing, tab nav)
- TypeScript
- react-native-svg (spin wheel rendering)
- expo-linear-gradient (gold + orange gradients)
- expo-haptics (tactile feedback on spin/scratch/withdraw)
- @react-native-async-storage/async-storage (persistence)
- @expo-google-fonts/inter (typography; Bengali falls back to system font)

## Project Structure

- `artifacts/mobile/` — Expo app
  - `app/(tabs)/` — Home, Spin, Scratch, Wallet
  - `components/` — Header, SpinWheel, ScratchCard, AdBanner, RewardedAdModal (generic, accepts duration/title/body/reward), RewardModal
  - `contexts/AppContext.tsx` — language, coins, daily counts, currency conversion helpers, withdraw with currency/method/payout, bonus-spin tracking
  - `i18n/translations.ts` — EN/BN dictionary + Bengali digit formatter
  - `constants/colors.ts` — dark gold theme tokens
- `artifacts/mockup-sandbox/` — design preview server (unused for this build)
- `artifacts/api-server/` — scaffold API (unused for this build)
