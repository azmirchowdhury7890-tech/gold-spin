# Goldspin — Bengali/English Rewards App

A premium dark-gold themed mobile rewards app (Expo + React Native) with bilingual UI (English / বাংলা).

## Features

- **Bilingual** — full EN/BN translation with toggle in the top header. Numbers also localize to Bengali digits.
- **Home** — balance card, daily streak, today's earnings, quick actions, daily task checklist (spin, scratch, watch ad), invite friends card, banner ad placeholder.
- **Spin & Win** — 3D-style gold wheel with 8 reward segments (5–100 coins), animated easing, daily limit (5 spins/day), reward modal.
- **Scratch & Win** — swipe-to-reveal scratch card, 8×8 cell grid, 45% reveal threshold, reward range 10–200 coins, daily limit (5 cards/day).
- **Wallet** — available balance, total earnings, today's earnings, withdraw button (min 1,000 coins), transaction history with type-aware icons.
- **Persistence** — language, coins, daily counts, streak, and transaction history all stored in AsyncStorage. Daily counters reset based on local date.
- **Ads** — banner placeholder on every screen + a rewarded video modal (5s mock playback, +50 coins, once/day).

## Stack

- Expo SDK 54 + Expo Router (file-based routing, tab nav)
- TypeScript
- react-native-svg (spin wheel rendering)
- expo-linear-gradient (gold gradients)
- expo-haptics (tactile feedback on spin/scratch/withdraw)
- @react-native-async-storage/async-storage (persistence)
- @expo-google-fonts/inter (typography; Bengali falls back to system font)

## Project Structure

- `artifacts/mobile/` — Expo app
  - `app/(tabs)/` — Home, Spin, Scratch, Wallet
  - `components/` — Header, SpinWheel, ScratchCard, AdBanner, RewardedAdModal, RewardModal
  - `contexts/AppContext.tsx` — language, coins, daily counts, transactions
  - `i18n/translations.ts` — EN/BN dictionary + Bengali digit formatter
  - `constants/colors.ts` — dark gold theme tokens
- `artifacts/mockup-sandbox/` — design preview server (unused for this build)
- `artifacts/api-server/` — scaffold API (unused for this build)
