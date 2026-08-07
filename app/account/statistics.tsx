import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { getOrCreateUserId } from '@/lib/userId';
import { listUserGames, getGame } from '@/lib/api';

interface StatsData {
  totalPlayed: number;
  totalWon: number;
  winRate: number;
  totalRounds: number;
  bestStreak: number;
  favouriteLeagues: { league: string; count: number }[];
  mostPickedTeams: { team: string; count: number }[];
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={22} color={accent ?? Colors.primary} />
      <Text style={[styles.statValue, accent ? { color: accent } : undefined]}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function PlayerStatisticsScreen() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasGames, setHasGames] = useState(true);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const userId = await getOrCreateUserId();
      const result = await listUserGames(userId);

      if (!result.ok) {
        setError(result.error);
        setLoading(false);
        return;
      }

      const allGames = result.data.games;
      if (allGames.length === 0) {
        setHasGames(false);
        setLoading(false);
        return;
      }

      // Fetch full detail for each non-cancelled game
      const playableGames = allGames.filter((g) => g.gameState !== 'cancelled');

      const details = await Promise.all(
        playableGames.map(async (g) => {
          try {
            const detail = await getGame(g.gameId);
            return detail.ok ? detail.data : null;
          } catch {
            return null;
          }
        }),
      );

      const validDetails = details.filter(Boolean) as NonNullable<(typeof details)[number]>[];

      // Compute stats
      const totalPlayed = validDetails.length;
      const totalWon = validDetails.filter(
        (d) =>
          d.state === 'completed' &&
          d.players.some((p) => p.userId === userId && p.status === 'alive'),
      ).length;
      const winRate = totalPlayed > 0 ? Math.round((totalWon / totalPlayed) * 100) : 0;

      // Rounds survived: count rounds where this player made a pick
      const totalRounds = validDetails.reduce((sum, detail) => {
        const playerPicks = (detail.picks ?? []).filter((p) => p.userId === userId);
        return sum + new Set(playerPicks.map((p) => p.roundNum)).size;
      }, 0);

      const bestStreak = validDetails.reduce((max, detail) => {
        const playerPicks = (detail.picks ?? []).filter((p) => p.userId === userId);
        const rounds = new Set(playerPicks.map((p) => p.roundNum)).size;
        return Math.max(max, rounds);
      }, 0);

      // Favourite leagues
      const leagueCounts = new Map<string, number>();
      validDetails.forEach((detail) => {
        detail.leagues.forEach((l) => {
          leagueCounts.set(l, (leagueCounts.get(l) ?? 0) + 1);
        });
      });
      const favouriteLeagues = [...leagueCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([league, count]) => ({ league, count }));

      // Most picked teams
      const teamCounts = new Map<string, number>();
      validDetails.forEach((detail) => {
        (detail.picks ?? [])
          .filter((p) => p.userId === userId)
          .forEach((p) => {
            teamCounts.set(p.teamName, (teamCounts.get(p.teamName) ?? 0) + 1);
          });
      });
      const mostPickedTeams = [...teamCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([team, count]) => ({ team, count }));

      setStats({
        totalPlayed,
        totalWon,
        winRate,
        totalRounds,
        bestStreak,
        favouriteLeagues,
        mostPickedTeams,
      });
      setHasGames(true);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats]),
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="cloud-offline-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.errorText}>Couldn't load statistics</Text>
        <Text style={styles.errorSubtext}>{error}</Text>
      </View>
    );
  }

  if (!hasGames || !stats) {
    return (
      <View style={styles.centered}>
        <Ionicons name="bar-chart-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.emptyTitle}>No statistics yet</Text>
        <Text style={styles.emptySubtitle}>
          Your stats will appear here once you've played some games
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Overview</Text>

      <View style={styles.grid}>
        <StatCard icon="game-controller-outline" label="Games Played" value={String(stats.totalPlayed)} />
        <StatCard icon="trophy-outline" label="Games Won" value={String(stats.totalWon)} accent={Colors.warning} />
        <StatCard icon="trending-up-outline" label="Win Rate" value={`${stats.winRate}%`} accent={Colors.success} />
        <StatCard icon="layers-outline" label="Rounds Survived" value={String(stats.totalRounds)} />
        <StatCard icon="flame-outline" label="Best Streak" value={String(stats.bestStreak)} accent={Colors.accent} />
      </View>

      {stats.favouriteLeagues.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Favourite Leagues</Text>
          {stats.favouriteLeagues.map((item) => (
            <View key={item.league} style={styles.listCard}>
              <Ionicons name="football-outline" size={20} color={Colors.primary} />
              <Text style={styles.listLabel}>{item.league}</Text>
              <Text style={styles.listCount}>{item.count} game{item.count !== 1 ? 's' : ''}</Text>
            </View>
          ))}
        </>
      )}

      {stats.mostPickedTeams.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Most Picked Teams</Text>
          {stats.mostPickedTeams.map((item) => (
            <View key={item.team} style={styles.listCard}>
              <Ionicons name="shirt-outline" size={20} color={Colors.accent} />
              <Text style={styles.listLabel}>{item.team}</Text>
              <Text style={styles.listCount}>{item.count} pick{item.count !== 1 ? 's' : ''}</Text>
            </View>
          ))}
        </>
      )}

      <View style={{ height: Spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
  },
  centered: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  statCard: {
    width: '47%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: 100,
    justifyContent: 'center',
  },
  statValue: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.text,
  },
  statLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  listLabel: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '500',
    color: Colors.text,
    marginLeft: Spacing.sm,
  },
  listCount: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  errorText: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.text,
    marginTop: Spacing.md,
  },
  errorSubtext: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
