import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { formatNumber } from "@/i18n/translations";
import { db } from "@/lib/firebase";

type WithdrawDoc = {
  id: string;
  uid: string;
  email: string | null;
  displayName: string | null;
  coinAmount: number;
  currency: "BDT" | "USD";
  method: string;
  payout: number;
  status: "pending" | "approved" | "rejected";
  createdAt: { toDate?: () => Date } | null;
};

type UserDoc = {
  id: string;
  email?: string;
  displayName?: string;
  coins?: number;
  role?: string;
};

function confirm(title: string, message: string, onYes: () => void) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.confirm(`${title}\n\n${message}`)) {
      onYes();
    }
    return;
  }
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: "Confirm", style: "destructive", onPress: onYes },
  ]);
}

export default function AdminPanelScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, language } = useApp();
  const { user, loading: authLoading } = useAuth();

  const [withdrawals, setWithdrawals] = useState<WithdrawDoc[]>([]);
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [tab, setTab] = useState<"withdrawals" | "users">("withdrawals");
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === "admin";

  // Live listener for withdrawals (newest first)
  useEffect(() => {
    if (!isAdmin) return;
    const q = query(
      collection(db, "withdrawals"),
      orderBy("createdAt", "desc"),
      limit(100),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: WithdrawDoc[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as Omit<WithdrawDoc, "id">) });
        });
        setWithdrawals(list);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, [isAdmin]);

  const refreshUsers = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const snap = await getDocs(
        query(collection(db, "users"), orderBy("createdAt", "desc"), limit(200)),
      );
      const list: UserDoc[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as Omit<UserDoc, "id">) });
      });
      setUsers(list);
    } catch {
      // ignore
    }
  }, [isAdmin]);

  useEffect(() => {
    refreshUsers();
  }, [refreshUsers]);

  const totalUsers = users.length;
  const totalCoinsCirculating = useMemo(
    () => users.reduce((sum, u) => sum + (u.coins ?? 0), 0),
    [users],
  );
  const pendingCount = useMemo(
    () => withdrawals.filter((w) => w.status === "pending").length,
    [withdrawals],
  );

  const setStatus = async (
    w: WithdrawDoc,
    next: "approved" | "rejected",
  ) => {
    setBusy(w.id);
    try {
      await updateDoc(doc(db, "withdrawals", w.id), {
        status: next,
        decidedAt: new Date(),
        decidedBy: user?.uid ?? null,
      });
      // On reject, refund the coins to the user
      if (next === "rejected") {
        const userRef = doc(db, "users", w.uid);
        const userRow = users.find((u) => u.id === w.uid);
        const newCoins = (userRow?.coins ?? 0) + w.coinAmount;
        await updateDoc(userRef, { coins: newCoins });
        refreshUsers();
      }
    } catch (e) {
      Alert.alert("Error", String((e as Error).message ?? e));
    } finally {
      setBusy(null);
    }
  };

  if (authLoading) {
    return (
      <View
        style={[
          styles.center,
          { flex: 1, backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  if (!user) {
    return (
      <View
        style={[
          styles.center,
          { flex: 1, backgroundColor: colors.background, padding: 24 },
        ]}
      >
        <Stack.Screen options={{ title: t("adminPanel") }} />
        <Feather name="lock" size={36} color={colors.gold} />
        <Text style={[styles.title, { color: colors.foreground, marginTop: 14 }]}>
          {t("accessDenied")}
        </Text>
        <Text
          style={[
            styles.subtitle,
            { color: colors.mutedForeground, marginTop: 6 },
          ]}
        >
          Please sign in first.
        </Text>
        <Pressable
          style={[styles.linkBtn, { borderColor: colors.gold, marginTop: 18 }]}
          onPress={() => router.replace("/(auth)/login")}
        >
          <Text style={[styles.linkBtnTxt, { color: colors.gold }]}>
            {t("signIn")}
          </Text>
        </Pressable>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View
        style={[
          styles.center,
          { flex: 1, backgroundColor: colors.background, padding: 24 },
        ]}
      >
        <Stack.Screen options={{ title: t("adminPanel") }} />
        <Feather name="shield-off" size={36} color="#FCA5A5" />
        <Text style={[styles.title, { color: colors.foreground, marginTop: 14 }]}>
          {t("accessDenied")}
        </Text>
        <Text
          style={[
            styles.subtitle,
            {
              color: colors.mutedForeground,
              marginTop: 6,
              textAlign: "center",
            },
          ]}
        >
          {t("adminOnly")}
        </Text>
        <Text
          style={[
            styles.hint,
            { color: colors.mutedForeground, marginTop: 12 },
          ]}
        >
          Signed in as {user.email}
        </Text>
        <Pressable
          style={[styles.linkBtn, { borderColor: colors.gold, marginTop: 18 }]}
          onPress={() => router.replace("/(tabs)")}
        >
          <Text style={[styles.linkBtnTxt, { color: colors.gold }]}>
            Back to App
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingBottom: insets.bottom,
      }}
    >
      <Stack.Screen options={{ title: t("adminPanel") }} />

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatCard
          label={t("totalUsers")}
          value={formatNumber(totalUsers, language)}
          icon="users"
          colors={colors}
        />
        <StatCard
          label={t("pending")}
          value={formatNumber(pendingCount, language)}
          icon="clock"
          colors={colors}
          accent="#FFB454"
        />
        <StatCard
          label={t("totalCoinsCirculating")}
          value={formatNumber(totalCoinsCirculating, language)}
          icon="dollar-sign"
          colors={colors}
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TabBtn
          active={tab === "withdrawals"}
          label={t("withdrawalRequests")}
          onPress={() => setTab("withdrawals")}
          colors={colors}
        />
        <TabBtn
          active={tab === "users"}
          label={t("manageUsers")}
          onPress={() => setTab("users")}
          colors={colors}
        />
      </View>

      {tab === "withdrawals" ? (
        loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.gold} />
          </View>
        ) : withdrawals.length === 0 ? (
          <View style={[styles.center, { padding: 24 }]}>
            <Feather name="inbox" size={28} color={colors.mutedForeground} />
            <Text style={{ color: colors.mutedForeground, marginTop: 10 }}>
              {t("noWithdrawals")}
            </Text>
          </View>
        ) : (
          <FlatList
            data={withdrawals}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            renderItem={({ item }) => (
              <WithdrawalRow
                w={item}
                colors={colors}
                language={language}
                busy={busy === item.id}
                onApprove={() =>
                  confirm(
                    t("approve"),
                    `${item.coinAmount} ${t("coins")} → ${item.payout} ${item.currency}`,
                    () => setStatus(item, "approved"),
                  )
                }
                onReject={() =>
                  confirm(
                    t("reject"),
                    `Refund ${item.coinAmount} ${t("coins")}?`,
                    () => setStatus(item, "rejected"),
                  )
                }
              />
            )}
          />
        )
      ) : (
        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              padding: 12,
            }}
          >
            <Pressable
              onPress={refreshUsers}
              style={[styles.refresh, { borderColor: colors.gold }]}
            >
              <Feather name="refresh-cw" size={12} color={colors.gold} />
              <Text style={{ color: colors.gold, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>
                {t("refresh")}
              </Text>
            </Pressable>
          </View>
          {users.length === 0 ? (
            <View style={[styles.center, { padding: 24 }]}>
              <Feather name="users" size={28} color={colors.mutedForeground} />
              <Text style={{ color: colors.mutedForeground, marginTop: 10 }}>
                {t("noUsers")}
              </Text>
            </View>
          ) : (
            <FlatList
              data={users}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16, gap: 8 }}
              renderItem={({ item }) => (
                <UserRow
                  u={item}
                  colors={colors}
                  language={language}
                />
              )}
            />
          )}
        </View>
      )}
    </View>
  );
}

function StatCard({
  label,
  value,
  icon,
  colors,
  accent,
}: {
  label: string;
  value: string;
  icon: keyof typeof Feather.glyphMap;
  colors: ReturnType<typeof useColors>;
  accent?: string;
}) {
  return (
    <LinearGradient
      colors={["#15151F", "#1F1F2C"]}
      style={[styles.stat, { borderColor: colors.border }]}
    >
      <Feather name={icon} size={14} color={accent ?? colors.gold} />
      <Text style={[styles.statValue, { color: colors.foreground }]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
    </LinearGradient>
  );
}

function TabBtn({
  active,
  label,
  onPress,
  colors,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.tabBtn,
        {
          borderBottomColor: active ? colors.gold : "transparent",
        },
      ]}
    >
      <Text
        style={{
          color: active ? colors.gold : colors.mutedForeground,
          fontFamily: active ? "Inter_700Bold" : "Inter_500Medium",
          fontSize: 13,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function WithdrawalRow({
  w,
  colors,
  language,
  busy,
  onApprove,
  onReject,
}: {
  w: WithdrawDoc;
  colors: ReturnType<typeof useColors>;
  language: "en" | "bn";
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const date = w.createdAt?.toDate?.() ?? null;
  const dateStr = date
    ? date.toLocaleString(language === "bn" ? "bn-BD" : "en-US")
    : "—";
  const statusColor =
    w.status === "approved"
      ? "#4ADE80"
      : w.status === "rejected"
      ? "#FCA5A5"
      : "#FFB454";

  return (
    <View
      style={[
        styles.row,
        { borderColor: colors.border, backgroundColor: colors.surface },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowEmail, { color: colors.foreground }]}>
          {w.email ?? w.uid}
        </Text>
        <Text style={[styles.rowMeta, { color: colors.mutedForeground }]}>
          {formatNumber(w.coinAmount, language)} coins → {w.payout.toFixed(2)}{" "}
          {w.currency} · {w.method}
        </Text>
        <Text style={[styles.rowMeta, { color: colors.mutedForeground }]}>
          {dateStr}
        </Text>
        <View
          style={[
            styles.statusPill,
            { borderColor: statusColor, marginTop: 6 },
          ]}
        >
          <View
            style={[styles.statusDot, { backgroundColor: statusColor }]}
          />
          <Text
            style={{
              color: statusColor,
              fontFamily: "Inter_600SemiBold",
              fontSize: 11,
              textTransform: "uppercase",
            }}
          >
            {w.status}
          </Text>
        </View>
      </View>

      {w.status === "pending" ? (
        <View style={{ gap: 6, marginLeft: 8 }}>
          <Pressable
            disabled={busy}
            onPress={onApprove}
            style={[styles.actBtn, { backgroundColor: "#1F3A1F" }]}
          >
            {busy ? (
              <ActivityIndicator color="#4ADE80" size="small" />
            ) : (
              <>
                <Feather name="check" size={12} color="#4ADE80" />
                <Text style={{ color: "#4ADE80", fontFamily: "Inter_600SemiBold", fontSize: 11 }}>
                  Approve
                </Text>
              </>
            )}
          </Pressable>
          <Pressable
            disabled={busy}
            onPress={onReject}
            style={[styles.actBtn, { backgroundColor: "#3A1F1F" }]}
          >
            <Feather name="x" size={12} color="#FCA5A5" />
            <Text style={{ color: "#FCA5A5", fontFamily: "Inter_600SemiBold", fontSize: 11 }}>
              Reject
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function UserRow({
  u,
  colors,
  language,
}: {
  u: UserDoc;
  colors: ReturnType<typeof useColors>;
  language: "en" | "bn";
}) {
  return (
    <View
      style={[
        styles.row,
        { borderColor: colors.border, backgroundColor: colors.surface },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowEmail, { color: colors.foreground }]}>
          {u.displayName ?? u.email ?? u.id}
        </Text>
        <Text style={[styles.rowMeta, { color: colors.mutedForeground }]}>
          {u.email ?? "—"}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text
          style={{
            color: colors.gold,
            fontFamily: "Inter_700Bold",
            fontSize: 14,
          }}
        >
          {formatNumber(u.coins ?? 0, language)}
        </Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>
          coins
        </Text>
        {u.role === "admin" ? (
          <View
            style={[styles.adminPill, { borderColor: colors.gold, marginTop: 4 }]}
          >
            <Text
              style={{
                color: colors.gold,
                fontFamily: "Inter_600SemiBold",
                fontSize: 9,
              }}
            >
              ADMIN
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  title: { fontFamily: "Inter_700Bold", fontSize: 18 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 13 },
  hint: { fontFamily: "Inter_400Regular", fontSize: 11 },
  linkBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  linkBtnTxt: { fontFamily: "Inter_700Bold", fontSize: 13 },

  statsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  stat: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 18 },
  statLabel: { fontFamily: "Inter_500Medium", fontSize: 10, letterSpacing: 0.4 },

  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1F1F2A",
  },
  tabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  rowEmail: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  rowMeta: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 2 },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },

  actBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 78,
    justifyContent: "center",
  },

  adminPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },

  refresh: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
});
