import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
} from "firebase/firestore";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AdBanner } from "@/components/AdBanner";
import { Header } from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import { formatNumber } from "@/i18n/translations";
import { db } from "@/lib/firebase";

const TOP_N = 50;

type LeaderEntry = {
  uid: string;
  displayName: string | null;
  email: string | null;
  coins: number;
  rank: number;
};

const MEDAL_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"] as const;
const MEDAL_BG = ["#2A2200", "#1E1E1E", "#231500"] as const;

function MedalBadge({ rank }: { rank: number }) {
  if (rank > 3) {
    return null;
  }
  const idx = rank - 1;
  return (
    <View
      style={[
        styles.medal,
        { backgroundColor: MEDAL_BG[idx], borderColor: MEDAL_COLORS[idx] },
      ]}
    >
      <Text style={[styles.medalText, { color: MEDAL_COLORS[idx] }]}>
        {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
      </Text>
    </View>
  );
}

function Avatar({
  name,
  email,
  size,
  colors,
  isMe,
}: {
  name: string | null;
  email: string | null;
  size: number;
  colors: ReturnType<typeof useColors>;
  isMe: boolean;
}) {
  const initials = (() => {
    const src = name ?? email ?? "?";
    const parts = src.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return src[0].toUpperCase();
  })();

  return (
    <LinearGradient
      colors={isMe ? ["#F4D27A", "#D4AF37"] : ["#2A2A3A", "#1E1E2C"]}
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: isMe ? colors.gold : colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.avatarText,
          { fontSize: size * 0.38, color: isMe ? "#0B0B14" : colors.foreground },
        ]}
      >
        {initials}
      </Text>
    </LinearGradient>
  );
}

function PodiumCard({
  entry,
  meUid,
  language,
  colors,
  height,
}: {
  entry: LeaderEntry;
  meUid: string;
  language: "en" | "bn";
  colors: ReturnType<typeof useColors>;
  height: number;
}) {
  const isMe = entry.uid === meUid;
  const idx = entry.rank - 1;

  return (
    <View style={[styles.podiumCol, { height }]}>
      {entry.rank === 1 && (
        <Text style={styles.crownEmoji}>👑</Text>
      )}
      <Avatar
        name={entry.displayName}
        email={entry.email}
        size={entry.rank === 1 ? 52 : 44}
        colors={colors}
        isMe={isMe}
      />
      <Text
        style={[styles.podiumName, { color: colors.foreground }]}
        numberOfLines={1}
      >
        {isMe ? "You" : (entry.displayName ?? entry.email ?? "—")}
      </Text>
      <Text style={[styles.podiumCoins, { color: colors.gold }]}>
        {formatNumber(entry.coins, language)}
      </Text>
      <LinearGradient
        colors={
          entry.rank === 1
            ? ["#F4D27A", "#D4AF37", "#8C6A1A"]
            : entry.rank === 2
            ? ["#C0C0C0", "#A0A0A0", "#707070"]
            : ["#CD7F32", "#A0622A", "#6B3D15"]
        }
        style={[styles.podiumPillar, { height: height * 0.45 }]}
      >
        <Text style={styles.podiumRankTxt}>{entry.rank}</Text>
      </LinearGradient>
    </View>
  );
}

function RankRow({
  entry,
  meUid,
  language,
  colors,
}: {
  entry: LeaderEntry;
  meUid: string;
  language: "en" | "bn";
  colors: ReturnType<typeof useColors>;
}) {
  const isMe = entry.uid === meUid;

  return (
    <View
      style={[
        styles.row,
        {
          borderColor: isMe ? colors.gold : colors.border,
          backgroundColor: isMe ? "rgba(212,175,55,0.08)" : colors.surface,
        },
      ]}
    >
      {entry.rank <= 3 ? (
        <MedalBadge rank={entry.rank} />
      ) : (
        <View style={[styles.rankBadge, { borderColor: colors.border }]}>
          <Text style={[styles.rankNum, { color: colors.mutedForeground }]}>
            {formatNumber(entry.rank, language)}
          </Text>
        </View>
      )}

      <Avatar
        name={entry.displayName}
        email={entry.email}
        size={38}
        colors={colors}
        isMe={isMe}
      />

      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text
          style={[
            styles.rowName,
            { color: isMe ? colors.gold : colors.foreground },
          ]}
          numberOfLines={1}
        >
          {isMe ? "You" : (entry.displayName ?? entry.email ?? "—")}
          {isMe ? " ⭐" : ""}
        </Text>
        {entry.email && !isMe && (
          <Text
            style={[styles.rowEmail, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {entry.email}
          </Text>
        )}
      </View>

      <View style={{ alignItems: "flex-end" }}>
        <Text style={[styles.rowCoins, { color: colors.gold }]}>
          {formatNumber(entry.coins, language)}
        </Text>
        <Text style={[styles.rowCoinsLabel, { color: colors.mutedForeground }]}>
          coins
        </Text>
      </View>
    </View>
  );
}

export default function LeaderboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t, language, coins } = useApp();

  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const snap = await getDocs(
        query(
          collection(db, "users"),
          orderBy("coins", "desc"),
          limit(TOP_N),
        ),
      );
      const list: LeaderEntry[] = [];
      let rank = 1;
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          uid: d.id,
          displayName: data.displayName ?? null,
          email: data.email ?? null,
          coins: data.coins ?? 0,
          rank: rank++,
        });
      });
      setEntries(list);

      // Find my rank
      const myIdx = list.findIndex((e) => e.uid === user?.uid);
      setMyRank(myIdx >= 0 ? myIdx + 1 : null);
    } catch {
      // ignore network errors
    }
  }, [user?.uid]);

  useEffect(() => {
    setLoading(true);
    fetchLeaderboard().finally(() => setLoading(false));
  }, [fetchLeaderboard]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLeaderboard();
    setRefreshing(false);
  };

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  // Podium display order: 2nd, 1st, 3rd
  const podiumOrder =
    top3.length === 3
      ? [top3[1], top3[0], top3[2]]
      : top3.length === 2
      ? [top3[1], top3[0]]
      : top3;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header />

      <FlatList
        data={rest}
        keyExtractor={(item) => item.uid}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 16,
          gap: 8,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.gold}
            colors={[colors.gold]}
          />
        }
        ListHeaderComponent={
          <>
            {/* Title */}
            <View style={styles.titleRow}>
              <Feather name="award" size={20} color={colors.gold} />
              <Text style={[styles.title, { color: colors.foreground }]}>
                {t("leaderboard")}
              </Text>
            </View>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {t("leaderboardSubtitle")}
            </Text>

            {/* My rank chip */}
            {user && myRank !== null && (
              <View
                style={[
                  styles.myRankChip,
                  { borderColor: colors.gold, backgroundColor: "rgba(212,175,55,0.1)" },
                ]}
              >
                <Feather name="star" size={13} color={colors.gold} />
                <Text style={[styles.myRankText, { color: colors.gold }]}>
                  {t("yourRank")}: #{formatNumber(myRank, language)}
                  {"  ·  "}
                  {formatNumber(coins, language)} {t("coins")}
                </Text>
              </View>
            )}

            {loading ? (
              <View style={{ padding: 60, alignItems: "center" }}>
                <ActivityIndicator color={colors.gold} size="large" />
              </View>
            ) : entries.length === 0 ? (
              <View style={{ padding: 60, alignItems: "center", gap: 12 }}>
                <Feather name="users" size={40} color={colors.mutedForeground} />
                <Text style={{ color: colors.mutedForeground, textAlign: "center" }}>
                  {t("noUsersYet")}
                </Text>
              </View>
            ) : (
              <>
                {/* Podium */}
                {top3.length > 0 && (
                  <View style={styles.podiumWrap}>
                    {podiumOrder.map((e) => (
                      <PodiumCard
                        key={e.uid}
                        entry={e}
                        meUid={user?.uid ?? ""}
                        language={language}
                        colors={colors}
                        height={e.rank === 1 ? 180 : e.rank === 2 ? 150 : 130}
                      />
                    ))}
                  </View>
                )}

                {/* Section label for rank 4+ */}
                {rest.length > 0 && (
                  <Text
                    style={[
                      styles.sectionLabel,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {t("rankings")}
                  </Text>
                )}
              </>
            )}
          </>
        }
        renderItem={({ item }) => (
          <RankRow
            entry={item}
            meUid={user?.uid ?? ""}
            language={language}
            colors={colors}
          />
        )}
        ListFooterComponent={
          !loading && entries.length > 0 ? (
            <View style={styles.footer}>
              <Feather name="refresh-cw" size={12} color={colors.mutedForeground} />
              <Text style={[styles.footerTxt, { color: colors.mutedForeground }]}>
                {t("pullToRefresh")}
              </Text>
            </View>
          ) : null
        }
      />

      <AdBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    marginBottom: 4,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginBottom: 12,
  },
  myRankChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  myRankText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },

  // Podium
  podiumWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 8,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  podiumCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },
  crownEmoji: {
    fontSize: 22,
    marginBottom: 2,
  },
  podiumName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    textAlign: "center",
    maxWidth: 80,
  },
  podiumCoins: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },
  podiumPillar: {
    width: "100%",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  podiumRankTxt: {
    color: "rgba(0,0,0,0.5)",
    fontFamily: "Inter_700Bold",
    fontSize: 22,
  },

  // Avatar
  avatar: {
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: "Inter_700Bold",
  },

  // Medal
  medal: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  medalText: {
    fontSize: 16,
  },

  // Rank badge
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  rankNum: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },

  // Row
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  rowName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  rowEmail: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 1,
  },
  rowCoins: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  rowCoinsLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
  },

  // Section label
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 4,
  },

  // Footer
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 16,
    marginBottom: 8,
  },
  footerTxt: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
});
