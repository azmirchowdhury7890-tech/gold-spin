import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
} from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { auth, db } from "@/lib/firebase";

export const WELCOME_BONUS = 500;

const ADMIN_EMAILS = ["admin@goldspin.app"];

export type AuthUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: "user" | "admin";
};

type AuthCtx = {
  user: AuthUser | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | null>(null);

async function loadRole(
  uid: string,
  email: string | null,
): Promise<"user" | "admin"> {
  if (email && ADMIN_EMAILS.includes(email.toLowerCase())) return "admin";
  try {
    const snap = await getDoc(doc(db, "users", uid));
    const data = snap.data();
    if (data?.role === "admin") return "admin";
  } catch {
    // ignore
  }
  return "user";
}

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fb) => {
      if (fb) {
        const role = await loadRole(fb.uid, fb.email);
        setUser({
          uid: fb.uid,
          email: fb.email,
          displayName: fb.displayName,
          role,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, displayName: string) => {
      const cred = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );
      const fb = cred.user;
      const today = new Date();
      const todayKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
      await setDoc(doc(db, "users", fb.uid), {
        uid: fb.uid,
        email: fb.email ?? email.trim(),
        displayName: displayName.trim(),
        coins: WELCOME_BONUS,
        todayEarnings: WELCOME_BONUS,
        spinsUsed: 0,
        bonusSpinsEarned: 0,
        scratchesUsed: 0,
        spinDate: todayKey,
        scratchDate: todayKey,
        adClaimedDate: null,
        streak: 1,
        streakDate: todayKey,
        inviteCode: generateInviteCode(),
        invitesSent: 0,
        inviteBonusEarned: 0,
        redeemedCode: null,
        role: "user",
        status: "active",
        createdAt: serverTimestamp(),
        lastActiveAt: serverTimestamp(),
      });
    },
    [],
  );

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }, []);

  const logout = useCallback(async () => {
    await fbSignOut(auth);
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({ user, loading, signUp, signIn, logout }),
    [user, loading, signUp, signIn, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
