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
  scratchDate: "@goldspin/scratchDate",
  scratchesUsed: "@goldspin/scratchesUsed",
  adClaimedDate: "@goldspin/adClaimedDate",
  streak: "@goldspin/streak",
  streakDate: "@goldspin/streakDate",
  txns: "@goldspin/txns",
} as const;

export const DAILY_SPIN_LIMIT = 5;
export const DAILY_SCRATCH_LIMIT = 5;
export const MIN_WITHDRAW = 1000;

export type TxnType = "spin" | "scratch" | "ad" | "withdraw" | "bonus";

export type Transaction = {
  id: string;
  type: TxnType;
  amount: number;
  timestamp: number;
};

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

  spinsLeft: number;
  scratchesLeft: number;

  addCoins: (amount: number, type: TxnType) => Promise<void>;
  recordSpinUsed: () => Promise<void>;
  recordScratchUsed: () => Promise<void>;
  claimAdReward: (amount: number) => Promise<boolean>;
  withdraw: (amount: number) => Promise<boolean>;

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

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [language, setLanguageState] = useState<Language>("en");
  const [coins, setCoins] = useState<number>(0);
  const [todayEarnings, setTodayEarnings] = useState<number>(0);
  const [spinsUsed, setSpinsUsed] = useState<number>(0);
  const [scratchesUsed, setScratchesUsed] = useState<number>(0);
  const [adClaimedToday, setAdClaimedToday] = useState<boolean>(false);
  const [streak, setStreak] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

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
          scratchDate,
          scratchesStr,
          adDate,
          streakStr,
          streakDate,
          txnsStr,
        ] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.language),
          AsyncStorage.getItem(STORAGE_KEYS.coins),
          AsyncStorage.getItem(STORAGE_KEYS.todayEarnings),
          AsyncStorage.getItem(STORAGE_KEYS.spinDate),
          AsyncStorage.getItem(STORAGE_KEYS.spinsUsed),
          AsyncStorage.getItem(STORAGE_KEYS.scratchDate),
          AsyncStorage.getItem(STORAGE_KEYS.scratchesUsed),
          AsyncStorage.getItem(STORAGE_KEYS.adClaimedDate),
          AsyncStorage.getItem(STORAGE_KEYS.streak),
          AsyncStorage.getItem(STORAGE_KEYS.streakDate),
          AsyncStorage.getItem(STORAGE_KEYS.txns),
        ]);

        if (lang === "en" || lang === "bn") setLanguageState(lang);
        setCoins(coinsStr ? Number(coinsStr) || 0 : 0);

        if (spinDate === today && spinsStr) {
          setSpinsUsed(Number(spinsStr) || 0);
        } else {
          setSpinsUsed(0);
          await AsyncStorage.setItem(STORAGE_KEYS.spinDate, today);
          await AsyncStorage.setItem(STORAGE_KEYS.spinsUsed, "0");
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

  const addCoins = useCallback(
    async (amount: number, type: TxnType) => {
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

  const claimAdReward = useCallback(
    async (amount: number) => {
      if (adClaimedToday) return false;
      setAdClaimedToday(true);
      await AsyncStorage.setItem(STORAGE_KEYS.adClaimedDate, todayKey());
      await addCoins(amount, "ad");
      return true;
    },
    [adClaimedToday, addCoins],
  );

  const withdraw = useCallback(
    async (amount: number) => {
      if (coins < amount || amount < MIN_WITHDRAW) return false;
      await addCoins(-amount, "withdraw");
      return true;
    },
    [coins, addCoins],
  );

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
      spinsLeft: Math.max(0, DAILY_SPIN_LIMIT - spinsUsed),
      scratchesLeft: Math.max(0, DAILY_SCRATCH_LIMIT - scratchesUsed),
      addCoins,
      recordSpinUsed,
      recordScratchUsed,
      claimAdReward,
      withdraw,
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
      addCoins,
      recordSpinUsed,
      recordScratchUsed,
      claimAdReward,
      withdraw,
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
