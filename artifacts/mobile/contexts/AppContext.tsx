import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "@/contexts/AuthContext";
import {
  type Language,
  type TranslationKey,
  translations,
} from "@/i18n/translations";
import { db } from "@/lib/firebase";
import { ensureDailyReminder } from "@/lib/notifications";

const STORAGE_KEYS = {
  language: "@goldspin/language",
  coins: "@goldspin/coins",
  todayEarnings: "@goldspin/todayEarnings",
  spinDate: "@goldspin/spinDate",
  spinsUsed: "@goldspin/spinsUsed",
  bonusSpinsEarned: "@goldspin/bonusSpinsEarned",
  scratchDate: "@goldspin/scratchDate",
  scratchesUsed: "@goldspin/scratchesUsed",
  adWatchedDate: "@goldspin/adWatchedDate",
  dailyAdsWatched: "@goldspin/dailyAdsWatched",
  streak: "@goldspin/streak",
  streakDate: "@goldspin/streakDate",
  txns: "@goldspin/txns",
  inviteCode: "@goldspin/inviteCode",
  redeemedCode: "@goldspin/redeemedCode",
  invitesSent: "@goldspin/invitesSent",
  inviteBonusEarned: "@goldspin/inviteBonusEarned",
  checkInClaimedDate: "@goldspin/checkInClaimedDate",
} as const;

export const DAILY_SPIN_LIMIT = 5;
export const DAILY_SCRATCH_LIMIT = 5;
export const DAILY_AD_LIMIT = 100;
export const INVITE_REWARD = 1000;

// Currency conversion
export const COINS_PER_BDT = 1000;
export const USD_PER_COIN = 0.0000085;
export const MIN_WITHDRAW = 100_000;

export type CurrencyCode = "BDT" | "USD";
export type WithdrawMethod = "bkash" | "nagad" | "binance" | "paypal";

export const METHODS_BY_CURRENCY: Record<CurrencyCode, WithdrawMethod[]> = {
  BDT: ["bkash", "nagad"],
  USD: ["binance", "paypal"],
};

export function coinsToBdt(coins: number): number {
  return coins / COINS_PER_BDT;
}

export function coinsToUsd(coins: number): number {
  return coins * USD_PER_COIN;
}

export type TxnType = "spin" | "scratch" | "ad" | "withdraw" | "bonus" | "invite";

export type Transaction = {
  id: string;
  type: TxnType;
  amount: number;
  timestamp: number;
  meta?: { currency?: CurrencyCode; method?: WithdrawMethod; payout?: number };
};

export type RedeemResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "own" | "already" };

type Ctx = {
  ready: boolean;
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: TranslationKey) => string;

  coins: number;
  todayEarnings: number;
  streak: number;

  spinsUsed: number;
  scratchesUsed: number;
  dailyAdsWatched: number;
  adLimitReached: boolean;

  freeSpinsLeft: number;
  bonusSpinsEarned: number;
  bonusSpinsLeft: number;
  totalSpinsLeft: number;
  scratchesLeft: number;

  inviteCode: string;
  redeemedCode: string | null;
  invitesSent: number;
  inviteBonusEarned: number;

  addCoins: (amount: number, type: TxnType) => Promise<void>;
  recordSpinUsed: () => Promise<void>;
  recordScratchUsed: () => Promise<void>;
  claimAdReward: (amount: number) => Promise<boolean>;
  grantBonusSpin: () => Promise<void>;
  withdraw: (
    coinAmount: number,
    currency: CurrencyCode,
    method: WithdrawMethod,
    payout: number,
  ) => Promise<boolean>;
  redeemInviteCode: (code: string) => Promise<RedeemResult>;
  recordInviteSent: () => Promise<void>;

  checkInAvailable: boolean;
  claimCheckIn: () => Promise<number>;

  transactions: Transaction[];
};

const AppContext = createContext<Ctx | null>(null);

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function makeId(): string {
  return Date.now().toString() + Math.random().toString(36).slice(2, 9);
}

const INVITE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += INVITE_CHARS[Math.floor(Math.random() * INVITE_CHARS.length)];
  }
  return code;
}

function normalizeCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}

function isValidCodeFormat(code: string): boolean {
  if (code.length !== 6) return false;
  for (const c of code) {
    if (!INVITE_CHARS.includes(c)) return false;
  }
  return true;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const [ready, setReady] = useState(false);
  const [language, setLanguageState] = useState<Language>("en");
  const [coins, setCoins] = useState<number>(0);
  const [todayEarnings, setTodayEarnings] = useState<number>(0);
  const [spinsUsed, setSpinsUsed] = useState<number>(0);
  const [bonusSpinsEarned, setBonusSpinsEarned] = useState<number>(0);
  const [scratchesUsed, setScratchesUsed] = useState<number>(0);
  const [dailyAdsWatched, setDailyAdsWatched] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [inviteCode, setInviteCode] = useState<string>("");
  const [redeemedCode, setRedeemedCode] = useState<string | null>(null);
  const [invitesSent, setInvitesSent] = useState<number>(0);
  const [inviteBonusEarned, setInviteBonusEarned] = useState<number>(0);
  const [checkInAvailable, setCheckInAvailable] = useState<boolean>(false);

  const syncUser = useCallback(
    (updates: Record<string, unknown>) => {
      if (!uid) return;
      updateDoc(doc(db, "users", uid), {
        ...updates,
        lastActiveAt: serverTimestamp(),
      }).catch(() => {
        // best-effort sync; offline cache (AsyncStorage) keeps the UI working
      });
    },
    [uid],
  );

  // Hydrate from Firestore when user signs in
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", uid));
        if (cancelled || !snap.exists()) return;
        const data = snap.data() as Record<string, unknown>;
        const today = todayKey();

        if (typeof data.coins === "number") setCoins(data.coins);

        const sameSpinDay = data.spinDate === today;
        if (sameSpinDay && typeof data.spinsUsed === "number") {
          setSpinsUsed(data.spinsUsed);
          setBonusSpinsEarned(
            typeof data.bonusSpinsEarned === "number"
              ? data.bonusSpinsEarned
              : 0,
          );
        } else {
          setSpinsUsed(0);
          setBonusSpinsEarned(0);
        }

        const sameScratchDay = data.scratchDate === today;
        if (sameScratchDay && typeof data.scratchesUsed === "number") {
          setScratchesUsed(data.scratchesUsed);
        } else {
          setScratchesUsed(0);
        }

        const sameAdDay = data.adWatchedDate === today;
        setDailyAdsWatched(
          sameAdDay && typeof data.dailyAdsWatched === "number"
            ? data.dailyAdsWatched
            : 0,
        );

        if ((sameSpinDay || sameScratchDay) && typeof data.todayEarnings === "number") {
          setTodayEarnings(data.todayEarnings);
        } else {
          setTodayEarnings(0);
        }

        if (typeof data.streak === "number") setStreak(data.streak);
        if (typeof data.invitesSent === "number") setInvitesSent(data.invitesSent);
        if (typeof data.inviteBonusEarned === "number")
          setInviteBonusEarned(data.inviteBonusEarned);
        if (
          typeof data.inviteCode === "string" &&
          isValidCodeFormat(data.inviteCode)
        ) {
          setInviteCode(data.inviteCode);
          await AsyncStorage.setItem(STORAGE_KEYS.inviteCode, data.inviteCode);
        }
        if (typeof data.redeemedCode === "string") {
          setRedeemedCode(data.redeemedCode);
        } else if (data.redeemedCode === null) {
          setRedeemedCode(null);
        }
      } catch {
        // ignore — local state remains
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  useEffect(() => {
    (async () => {
      try {
        const today = todayKey();
        const [
          lang,
          coinsStr,
          earningsStr,
          spinDate,
          spinsStr,
          bonusStr,
          scratchDate,
          scratchesStr,
          adWatchedDate,
          dailyAdsWatchedStr,
          streakStr,
          streakDate,
          txnsStr,
          codeStr,
          redeemedStr,
          invitesStr,
          inviteBonusStr,
        ] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.language),
          AsyncStorage.getItem(STORAGE_KEYS.coins),
          AsyncStorage.getItem(STORAGE_KEYS.todayEarnings),
          AsyncStorage.getItem(STORAGE_KEYS.spinDate),
          AsyncStorage.getItem(STORAGE_KEYS.spinsUsed),
          AsyncStorage.getItem(STORAGE_KEYS.bonusSpinsEarned),
          AsyncStorage.getItem(STORAGE_KEYS.scratchDate),
          AsyncStorage.getItem(STORAGE_KEYS.scratchesUsed),
          AsyncStorage.getItem(STORAGE_KEYS.adWatchedDate),
          AsyncStorage.getItem(STORAGE_KEYS.dailyAdsWatched),
          AsyncStorage.getItem(STORAGE_KEYS.streak),
          AsyncStorage.getItem(STORAGE_KEYS.streakDate),
          AsyncStorage.getItem(STORAGE_KEYS.txns),
          AsyncStorage.getItem(STORAGE_KEYS.inviteCode),
          AsyncStorage.getItem(STORAGE_KEYS.redeemedCode),
          AsyncStorage.getItem(STORAGE_KEYS.invitesSent),
          AsyncStorage.getItem(STORAGE_KEYS.inviteBonusEarned),
        ]);

        if (lang === "en" || lang === "bn") setLanguageState(lang);
        setCoins(coinsStr ? Number(coinsStr) || 0 : 0);

        if (spinDate === today && spinsStr) {
          setSpinsUsed(Number(spinsStr) || 0);
          setBonusSpinsEarned(bonusStr ? Number(bonusStr) || 0 : 0);
        } else {
          setSpinsUsed(0);
          setBonusSpinsEarned(0);
          await AsyncStorage.setItem(STORAGE_KEYS.spinDate, today);
          await AsyncStorage.setItem(STORAGE_KEYS.spinsUsed, "0");
          await AsyncStorage.setItem(STORAGE_KEYS.bonusSpinsEarned, "0");
        }

        if (scratchDate === today && scratchesStr) {
          setScratchesUsed(Number(scratchesStr) || 0);
        } else {
          setScratchesUsed(0);
          await AsyncStorage.setItem(STORAGE_KEYS.scratchDate, today);
          await AsyncStorage.setItem(STORAGE_KEYS.scratchesUsed, "0");
        }

        if (adWatchedDate === today && dailyAdsWatchedStr) {
          setDailyAdsWatched(Number(dailyAdsWatchedStr) || 0);
        } else {
          setDailyAdsWatched(0);
        }

        if (spinDate === today || scratchDate === today) {
          setTodayEarnings(earningsStr ? Number(earningsStr) || 0 : 0);
        } else {
          setTodayEarnings(0);
          await AsyncStorage.setItem(STORAGE_KEYS.todayEarnings, "0");
        }

        const prevStreak = streakStr ? Number(streakStr) || 0 : 0;
        if (streakDate) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yKey = `${yesterday.getFullYear()}-${yesterday.getMonth() + 1}-${yesterday.getDate()}`;
          if (streakDate === today) {
            setStreak(prevStreak);
          } else if (streakDate === yKey) {
            const next = prevStreak + 1;
            setStreak(next);
            await AsyncStorage.setItem(STORAGE_KEYS.streak, String(next));
            await AsyncStorage.setItem(STORAGE_KEYS.streakDate, today);
          } else {
            setStreak(1);
            await AsyncStorage.setItem(STORAGE_KEYS.streak, "1");
            await AsyncStorage.setItem(STORAGE_KEYS.streakDate, today);
          }
        } else {
          setStreak(1);
          await AsyncStorage.setItem(STORAGE_KEYS.streak, "1");
          await AsyncStorage.setItem(STORAGE_KEYS.streakDate, today);
        }

        if (txnsStr) {
          try {
            const parsed = JSON.parse(txnsStr) as Transaction[];
            if (Array.isArray(parsed)) setTransactions(parsed.slice(0, 50));
          } catch {
            // ignore
          }
        }

        // Invite code: generate once and persist
        if (codeStr && isValidCodeFormat(codeStr)) {
          setInviteCode(codeStr);
        } else {
          const next = generateInviteCode();
          setInviteCode(next);
          await AsyncStorage.setItem(STORAGE_KEYS.inviteCode, next);
        }

        if (redeemedStr) setRedeemedCode(redeemedStr);
        if (invitesStr) setInvitesSent(Number(invitesStr) || 0);
        if (inviteBonusStr)
          setInviteBonusEarned(Number(inviteBonusStr) || 0);

        // Daily check-in: available if not yet claimed today
        const checkInDate = await AsyncStorage.getItem(
          STORAGE_KEYS.checkInClaimedDate,
        );
        setCheckInAvailable(checkInDate !== today);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const persistTxns = useCallback(async (next: Transaction[]) => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.txns,
      JSON.stringify(next.slice(0, 50)),
    );
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    AsyncStorage.setItem(STORAGE_KEYS.language, lang).catch(() => {});
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => {
      const next: Language = prev === "en" ? "bn" : "en";
      AsyncStorage.setItem(STORAGE_KEYS.language, next).catch(() => {});
      return next;
    });
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => translations[language][key],
    [language],
  );

  const addCoinsCore = useCallback(
    async (
      amount: number,
      type: TxnType,
      meta?: Transaction["meta"],
    ) => {
      if (amount === 0) return;
      let nextCoins = 0;
      let nextEarnings = 0;
      setCoins((c) => {
        nextCoins = c + amount;
        return nextCoins;
      });
      if (amount > 0) {
        setTodayEarnings((e) => {
          nextEarnings = e + amount;
          return nextEarnings;
        });
      }
      const txn: Transaction = {
        id: makeId(),
        type,
        amount,
        timestamp: Date.now(),
        meta,
      };
      setTransactions((prev) => {
        const next = [txn, ...prev].slice(0, 50);
        persistTxns(next).catch(() => {});
        return next;
      });
      await AsyncStorage.setItem(STORAGE_KEYS.coins, String(nextCoins));
      if (amount > 0) {
        await AsyncStorage.setItem(
          STORAGE_KEYS.todayEarnings,
          String(nextEarnings),
        );
      }
      const updates: Record<string, unknown> = { coins: nextCoins };
      if (amount > 0) updates.todayEarnings = nextEarnings;
      syncUser(updates);
    },
    [persistTxns, syncUser],
  );

  const addCoins = useCallback(
    async (amount: number, type: TxnType) => {
      await addCoinsCore(amount, type);
    },
    [addCoinsCore],
  );

  const recordSpinUsed = useCallback(async () => {
    const next = spinsUsed + 1;
    const today = todayKey();
    setSpinsUsed(next);
    await AsyncStorage.setItem(STORAGE_KEYS.spinDate, today);
    await AsyncStorage.setItem(STORAGE_KEYS.spinsUsed, String(next));
    syncUser({ spinDate: today, spinsUsed: next });
  }, [spinsUsed, syncUser]);

  const recordScratchUsed = useCallback(async () => {
    const next = scratchesUsed + 1;
    const today = todayKey();
    setScratchesUsed(next);
    await AsyncStorage.setItem(STORAGE_KEYS.scratchDate, today);
    await AsyncStorage.setItem(STORAGE_KEYS.scratchesUsed, String(next));
    syncUser({ scratchDate: today, scratchesUsed: next });
  }, [scratchesUsed, syncUser]);

  const grantBonusSpin = useCallback(async () => {
    const next = bonusSpinsEarned + 1;
    const today = todayKey();
    setBonusSpinsEarned(next);
    await AsyncStorage.setItem(STORAGE_KEYS.spinDate, today);
    await AsyncStorage.setItem(STORAGE_KEYS.bonusSpinsEarned, String(next));
    syncUser({ spinDate: today, bonusSpinsEarned: next });
  }, [bonusSpinsEarned, syncUser]);

  const claimAdReward = useCallback(
    async (amount: number) => {
      if (dailyAdsWatched >= DAILY_AD_LIMIT) return false;
      const today = todayKey();
      const next = dailyAdsWatched + 1;
      setDailyAdsWatched(next);
      await AsyncStorage.setItem(STORAGE_KEYS.adWatchedDate, today);
      await AsyncStorage.setItem(STORAGE_KEYS.dailyAdsWatched, String(next));
      syncUser({ adWatchedDate: today, dailyAdsWatched: next });
      await addCoinsCore(amount, "ad");
      return true;
    },
    [dailyAdsWatched, addCoinsCore, syncUser],
  );

  const withdraw = useCallback(
    async (
      coinAmount: number,
      currency: CurrencyCode,
      method: WithdrawMethod,
      payout: number,
    ) => {
      if (coins < coinAmount || coinAmount < MIN_WITHDRAW) return false;
      // Record the request in Firestore as pending (admin will approve/reject)
      if (uid) {
        try {
          await addDoc(collection(db, "withdrawals"), {
            uid,
            email: user?.email ?? null,
            displayName: user?.displayName ?? null,
            coinAmount,
            currency,
            method,
            payout,
            status: "pending",
            createdAt: serverTimestamp(),
          });
        } catch {
          // network errors should not block the local debit; the txn log keeps a copy
        }
      }
      await addCoinsCore(-coinAmount, "withdraw", {
        currency,
        method,
        payout,
      });
      return true;
    },
    [coins, addCoinsCore, uid, user?.email, user?.displayName],
  );

  const redeemInviteCode = useCallback(
    async (raw: string): Promise<RedeemResult> => {
      const code = normalizeCode(raw);
      if (!isValidCodeFormat(code)) return { ok: false, reason: "invalid" };
      if (code === inviteCode) return { ok: false, reason: "own" };
      if (redeemedCode) return { ok: false, reason: "already" };
      setRedeemedCode(code);
      await AsyncStorage.setItem(STORAGE_KEYS.redeemedCode, code);
      syncUser({ redeemedCode: code });
      await addCoinsCore(INVITE_REWARD, "invite");
      return { ok: true };
    },
    [inviteCode, redeemedCode, addCoinsCore, syncUser],
  );

  const recordInviteSent = useCallback(async () => {
    // Local-only mock: each share grants the user the inviter-side bonus,
    // since on a real backend the friend's signup would trigger this.
    const nextSent = invitesSent + 1;
    const nextBonus = inviteBonusEarned + INVITE_REWARD;
    setInvitesSent(nextSent);
    setInviteBonusEarned(nextBonus);
    await AsyncStorage.setItem(STORAGE_KEYS.invitesSent, String(nextSent));
    await AsyncStorage.setItem(
      STORAGE_KEYS.inviteBonusEarned,
      String(nextBonus),
    );
    syncUser({ invitesSent: nextSent, inviteBonusEarned: nextBonus });
    await addCoinsCore(INVITE_REWARD, "invite");
  }, [invitesSent, inviteBonusEarned, addCoinsCore, syncUser]);

  const CHECKIN_REWARDS = [100, 200, 300, 400, 500, 700, 1_000];

  const claimCheckIn = useCallback(async (): Promise<number> => {
    const today = todayKey();
    const reward =
      CHECKIN_REWARDS[(Math.max(1, streak) - 1) % CHECKIN_REWARDS.length];
    setCheckInAvailable(false);
    await AsyncStorage.setItem(STORAGE_KEYS.checkInClaimedDate, today);
    await addCoinsCore(reward, "bonus");
    syncUser({ checkInClaimedDate: today });
    // Schedule (or refresh) tomorrow's daily reminder after a successful claim
    ensureDailyReminder().catch(() => {});
    return reward;
  }, [streak, addCoinsCore, syncUser]);

  // Request notification permission and ensure daily reminder once per login
  useEffect(() => {
    if (!uid) return;
    ensureDailyReminder().catch(() => {});
  }, [uid]);

  const freeSpinsLeft = Math.max(0, DAILY_SPIN_LIMIT - spinsUsed);
  const bonusSpinsLeft = Math.max(
    0,
    bonusSpinsEarned - Math.max(0, spinsUsed - DAILY_SPIN_LIMIT),
  );
  const totalSpinsLeft = freeSpinsLeft + bonusSpinsLeft;

  const value = useMemo<Ctx>(
    () => ({
      ready,
      language,
      setLanguage,
      toggleLanguage,
      t,
      coins,
      todayEarnings,
      streak,
      spinsUsed,
      scratchesUsed,
      dailyAdsWatched,
      adLimitReached: dailyAdsWatched >= DAILY_AD_LIMIT,
      freeSpinsLeft,
      bonusSpinsEarned,
      bonusSpinsLeft,
      totalSpinsLeft,
      scratchesLeft: Math.max(0, DAILY_SCRATCH_LIMIT - scratchesUsed),
      inviteCode,
      redeemedCode,
      invitesSent,
      inviteBonusEarned,
      addCoins,
      recordSpinUsed,
      recordScratchUsed,
      claimAdReward,
      grantBonusSpin,
      withdraw,
      redeemInviteCode,
      recordInviteSent,
      checkInAvailable,
      claimCheckIn,
      transactions,
    }),
    [
      ready,
      language,
      setLanguage,
      toggleLanguage,
      t,
      coins,
      todayEarnings,
      streak,
      spinsUsed,
      scratchesUsed,
      dailyAdsWatched,
      freeSpinsLeft,
      bonusSpinsEarned,
      bonusSpinsLeft,
      totalSpinsLeft,
      inviteCode,
      redeemedCode,
      invitesSent,
      inviteBonusEarned,
      addCoins,
      recordSpinUsed,
      recordScratchUsed,
      claimAdReward,
      grantBonusSpin,
      withdraw,
      redeemInviteCode,
      recordInviteSent,
      checkInAvailable,
      claimCheckIn,
      transactions,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): Ctx {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
