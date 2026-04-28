import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  type Language,
  type TranslationKey,
  translations,
} from "@/i18n/translations";

const STORAGE_KEYS = {
  language: "@goldspin/language",
  coins: "@goldspin/coins",
  todayEarnings: "@goldspin/todayEarnings",
  spinDate: "@goldspin/spinDate",
  spinsUsed: "@goldspin/spinsUsed",
  bonusSpinsEarned: "@goldspin/bonusSpinsEarned",
  scratchDate: "@goldspin/scratchDate",
  scratchesUsed: "@goldspin/scratchesUsed",
  adClaimedDate: "@goldspin/adClaimedDate",
  streak: "@goldspin/streak",
  streakDate: "@goldspin/streakDate",
  txns: "@goldspin/txns",
  inviteCode: "@goldspin/inviteCode",
  redeemedCode: "@goldspin/redeemedCode",
  invitesSent: "@goldspin/invitesSent",
  inviteBonusEarned: "@goldspin/inviteBonusEarned",
} as const;

export const DAILY_SPIN_LIMIT = 5;
export const DAILY_SCRATCH_LIMIT = 5;
export const INVITE_REWARD = 100;

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
  adClaimedToday: boolean;

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
  const [ready, setReady] = useState(false);
  const [language, setLanguageState] = useState<Language>("en");
  const [coins, setCoins] = useState<number>(0);
  const [todayEarnings, setTodayEarnings] = useState<number>(0);
  const [spinsUsed, setSpinsUsed] = useState<number>(0);
  const [bonusSpinsEarned, setBonusSpinsEarned] = useState<number>(0);
  const [scratchesUsed, setScratchesUsed] = useState<number>(0);
  const [adClaimedToday, setAdClaimedToday] = useState<boolean>(false);
  const [streak, setStreak] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [inviteCode, setInviteCode] = useState<string>("");
  const [redeemedCode, setRedeemedCode] = useState<string | null>(null);
  const [invitesSent, setInvitesSent] = useState<number>(0);
  const [inviteBonusEarned, setInviteBonusEarned] = useState<number>(0);

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
          adDate,
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
          AsyncStorage.getItem(STORAGE_KEYS.adClaimedDate),
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

        if (adDate === today) setAdClaimedToday(true);

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
    },
    [persistTxns],
  );

  const addCoins = useCallback(
    async (amount: number, type: TxnType) => {
      await addCoinsCore(amount, type);
    },
    [addCoinsCore],
  );

  const recordSpinUsed = useCallback(async () => {
    const next = spinsUsed + 1;
    setSpinsUsed(next);
    await AsyncStorage.setItem(STORAGE_KEYS.spinDate, todayKey());
    await AsyncStorage.setItem(STORAGE_KEYS.spinsUsed, String(next));
  }, [spinsUsed]);

  const recordScratchUsed = useCallback(async () => {
    const next = scratchesUsed + 1;
    setScratchesUsed(next);
    await AsyncStorage.setItem(STORAGE_KEYS.scratchDate, todayKey());
    await AsyncStorage.setItem(STORAGE_KEYS.scratchesUsed, String(next));
  }, [scratchesUsed]);

  const grantBonusSpin = useCallback(async () => {
    const next = bonusSpinsEarned + 1;
    setBonusSpinsEarned(next);
    await AsyncStorage.setItem(STORAGE_KEYS.spinDate, todayKey());
    await AsyncStorage.setItem(STORAGE_KEYS.bonusSpinsEarned, String(next));
  }, [bonusSpinsEarned]);

  const claimAdReward = useCallback(
    async (amount: number) => {
      if (adClaimedToday) return false;
      setAdClaimedToday(true);
      await AsyncStorage.setItem(STORAGE_KEYS.adClaimedDate, todayKey());
      await addCoinsCore(amount, "ad");
      return true;
    },
    [adClaimedToday, addCoinsCore],
  );

  const withdraw = useCallback(
    async (
      coinAmount: number,
      currency: CurrencyCode,
      method: WithdrawMethod,
      payout: number,
    ) => {
      if (coins < coinAmount || coinAmount < MIN_WITHDRAW) return false;
      await addCoinsCore(-coinAmount, "withdraw", {
        currency,
        method,
        payout,
      });
      return true;
    },
    [coins, addCoinsCore],
  );

  const redeemInviteCode = useCallback(
    async (raw: string): Promise<RedeemResult> => {
      const code = normalizeCode(raw);
      if (!isValidCodeFormat(code)) return { ok: false, reason: "invalid" };
      if (code === inviteCode) return { ok: false, reason: "own" };
      if (redeemedCode) return { ok: false, reason: "already" };
      setRedeemedCode(code);
      await AsyncStorage.setItem(STORAGE_KEYS.redeemedCode, code);
      await addCoinsCore(INVITE_REWARD, "invite");
      return { ok: true };
    },
    [inviteCode, redeemedCode, addCoinsCore],
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
    await addCoinsCore(INVITE_REWARD, "invite");
  }, [invitesSent, inviteBonusEarned, addCoinsCore]);

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
      adClaimedToday,
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
      adClaimedToday,
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
