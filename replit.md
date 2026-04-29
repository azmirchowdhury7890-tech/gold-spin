# Goldspin — Bengali/English Rewards App

A premium dark-gold themed mobile rewards app (Expo + React Native) with bilingual UI (English / বাংলা), dual-currency withdrawals, watch-ad-to-spin loop, and full Firebase backend (Auth + Firestore).

## Features

- **Auth (Firebase)** — email/password sign-up & sign-in. New users receive **500 welcome coins** and a unique 6-character invite code. Auth gate on `(tabs)` redirects unauthenticated users to `/(auth)/login`. Logout button in the header.
- **Bilingual** — full EN/BN translation with toggle in the top header. Numbers also localize to Bengali digits.
- **Home** — balance card with **BDT and USD equivalent pills**, daily streak, today's earnings, daily-spins-left chip, quick actions, daily task checklist (spin, scratch, watch ad), tappable invite friends card (opens referral sheet), banner ad placeholder.
- **Referral / Invite** — each player gets a unique 6-character invite code (auto-generated and persisted). Bottom-sheet UI with: big gold code display, **Copy** + **Share Code** buttons, live stats for invites sent and bonus earned, a "How it works" 3-step explainer, and an **Apply code** input that validates format, blocks the user's own code, and prevents double-redeeming. Both sides earn **100 coins** when a friend joins.
- **Spin & Win** — 3D-style gold wheel with 8 reward segments (5–100 coins), animated easing, **5 free spins/day**. After free spins are used the button switches to **"Watch Ad to Spin"** (orange gradient + gift icon) and a 15s rewarded ad grants 1 bonus spin.
- **Scratch & Win** — swipe-to-reveal scratch card, 8×8 cell grid, 45% reveal threshold, reward range 10–200 coins, 5 cards/day.
- **Wallet — multi-currency withdraw** —
  - Currency toggle: **BDT** (1,000 Coins = ৳1) / **USD** (1,000 Coins = $0.0085)
  - Methods: **BDT → bKash, Nagad** · **USD → Binance (USDT), PayPal**
  - Min withdraw: **100,000 Coins** (= ৳100 / ~$0.85)
  - Withdrawal requests are written to Firestore `/withdrawals` with `status: pending` for admin review.
- **Hidden Admin Panel** — accessible at route `/gold-admin-control` (no link in UI). Gated by `user.role === 'admin'` (set via Firestore `users/{uid}.role` field, or by email match in `ADMIN_EMAILS`). Admin can:
  - View live stats: total users, total coins in circulation, pending withdrawal count
  - Approve / Reject pending withdrawals (Reject auto-refunds the coins back to the user)
  - Browse all users with their balances
- **Firestore real-time sync** — coins, daily counters, streak, invite stats, and withdrawal history all sync to `/users/{uid}`. AsyncStorage acts as offline cache; Firestore is source of truth on auth.
- **Ads** — banner placeholder on every screen + a generic rewarded video modal used for both the daily 50-coin ad (5s) and the watch-ad-to-spin reward (15s).

## Stack

- Expo SDK 54 + Expo Router (file-based routing, tab nav)
- TypeScript
- **Firebase JS SDK** (`firebase` v12) — Auth + Firestore
- react-native-svg (spin wheel rendering)
- expo-linear-gradient, expo-haptics, @react-native-async-storage/async-storage
- @expo-google-fonts/inter

## Firebase Setup

The app is wired to Firebase project **`gold-spin-92e17`** with config hardcoded in `artifacts/mobile/lib/firebase.ts` (web config keys are public-facing — security comes from Firestore rules, not API key secrecy).

### Required Firestore collections

- `users/{uid}` — user profile + game state (coins, spins, streak, role, etc.)
- `withdrawals/{auto-id}` — withdrawal requests with `status: pending | approved | rejected`

### Recommended Firestore rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    function isSignedIn() { return request.auth != null; }
    function isAdmin() {
      return isSignedIn() &&
        get(/databases/$(db)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    match /users/{uid} {
      allow read: if isSignedIn() && (request.auth.uid == uid || isAdmin());
      allow create: if isSignedIn() && request.auth.uid == uid;
      allow update: if isSignedIn() && (request.auth.uid == uid || isAdmin());
    }

    match /withdrawals/{id} {
      allow read: if isSignedIn() && (resource.data.uid == request.auth.uid || isAdmin());
      allow create: if isSignedIn() && request.resource.data.uid == request.auth.uid;
      allow update: if isAdmin();
    }
  }
}
```

### Promoting an admin

Set `role: "admin"` on a user doc in Firestore, **or** add their email to `ADMIN_EMAILS` in `contexts/AuthContext.tsx`. Default admin email seeded: `admin@goldspin.app`. Then visit the hidden URL `/gold-admin-control` while signed in.

## Project Structure

- `artifacts/mobile/` — Expo app
  - `app/(auth)/` — login + signup screens
  - `app/(tabs)/` — Home, Spin, Scratch, Wallet (gated by auth)
  - `app/gold-admin-control.tsx` — hidden admin panel
  - `lib/firebase.ts` — Firebase init (Auth + Firestore)
  - `contexts/AuthContext.tsx` — user state, signup/signin/logout, admin role check
  - `contexts/AppContext.tsx` — language, coins, daily counts, currency conversion, Firestore sync
  - `components/` — Header, SpinWheel, ScratchCard, AdBanner, RewardedAdModal, RewardModal
  - `i18n/translations.ts` — EN/BN dictionary + Bengali digit formatter
  - `constants/colors.ts` — dark gold theme tokens

## Building the Android APK

The published web preview runs in Replit, but Android APK builds use **EAS Build** (Expo Application Services).

### One-time setup (do this on your local machine)

1. Install the EAS CLI:
   ```
   npm install -g eas-cli
   ```
2. Sign in with your Expo account (free):
   ```
   eas login
   ```
3. Download the project from Replit (Tools → Git, or **Download as zip**) and `cd artifacts/mobile`.
4. Initialize EAS in the mobile folder (only the first time):
   ```
   eas init
   ```
   It will create an `eas.json` and link the project to your Expo account.

### Build the APK

From `artifacts/mobile/`:

```
eas build --platform android --profile preview
```

Use the `preview` profile for a **shareable .apk** file. Use `--profile production` for a `.aab` (Play Store bundle).

When the build finishes (takes ~10–15 min), EAS gives you a download URL. Install the `.apk` on any Android phone (enable "Install unknown apps" once).

### Suggested `eas.json`

```json
{
  "cli": { "version": ">= 7.0.0" },
  "build": {
    "preview": {
      "android": { "buildType": "apk" },
      "distribution": "internal"
    },
    "production": {
      "android": { "buildType": "app-bundle" }
    }
  },
  "submit": { "production": {} }
}
```

### Notes

- Firebase config is already embedded — no extra env vars needed for the build.
- The app uses Expo Managed workflow, so no Android Studio is required.
- For iOS: `eas build --platform ios --profile preview` (requires Apple Developer account).
