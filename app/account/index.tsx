import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { getOrCreateUserId, getDisplayName } from '@/lib/userId';
import { listUserGames, getGame, type UserGame } from '@/lib/api';

type NavRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
};

function NavRow({ icon, label, onPress }: NavRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.navRow, pressed && styles.navRowPressed]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={22} color={Colors.primary} style={styles.navIcon} />
      <Text style={styles.navLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </Pressable>
  );
}

const STATUS_LABEL: Record<string, string> = {
  waiting_for_players: 'Waiting for players',
  active: 'Active',
  completed: 'Completed',
  rollover_pending: 'Rollover pending',
  cancelled: 'Cancelled',
  abandoned: 'Abandoned',
};

export default function AccountScreen() {
  const router = useRouter();
  const [games, setGames] = useState<(UserGame & { freshState?: string })[]>([]);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGames = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const userId = await getOrCreateUserId();
      getDisplayName().then(setDisplayName);

      const result = await listUserGames(userId);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      const userGames = result.data.games;

      // Fetch fresh game state for each game to fix stale denormalized state
      const freshGames = await Promise.all(
        userGames.map(async (g) => {
          try {
            const detail = await getGame(g.gameId);
            if (detail.ok) {
              return { ...g, freshState: detail.data.state };
            }
          } catch {
            // Fall back to denormalized state
          }
          return g;
        }),
      );

      setGames(freshGames);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load games');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadGames();
    }, [loadGames]),
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadGames(true)}
          tintColor={Colors.primary}
        />
      }
    >
      {/* Player header */}
      <View style={styles.playerHeader}>
        <Ionicons name="person-circle-outline" size={48} color={Colors.primary} />
        <Text style={styles.playerName}>{displayName || '…'}</Text>
      </View>

      {/* Current games */}
      <Text style={styles.sectionTitle}>Current Games</Text>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginBottom: Spacing.xl }} />
      ) : error ? (
        <View style={styles.emptyCard}>
          <Ionicons name="cloud-offline-outline" size={36} color={Colors.textMuted} />
          <Text style={styles.emptyText}>Couldn't load games</Text>
          <Text style={styles.emptySubtext}>{error}</Text>
        </View>
      ) : games.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="trophy-outline" size={36} color={Colors.textMuted} />
          <Text style={styles.emptyText}>You're not in any active games</Text>
        </View>
      ) : (
        games.map(game => (
          <Pressable
            key={game.gameId}
            style={({ pressed }) => [styles.gameCard, pressed && { opacity: 0.7 }]}
            onPress={() => router.push(`/game/${game.gameId}`)}
          >
            <View>
              <Text style={styles.gameName}>{game.gameName}</Text>
              <Text style={styles.gameStatus}>
                {STATUS_LABEL[game.freshState ?? game.gameState] ?? (game.freshState ?? game.gameState)}
                {' · '}
                {game.playerStatus}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </Pressable>
        ))
      )}

      {/* Navigation */}
      <Text style={styles.sectionTitle}>My Account</Text>

      <View style={styles.navCard}>
        <NavRow
          icon="time-outline"
          label="Game History"
          onPress={() => router.push('/account/history')}
        />
        <View style={styles.divider} />
        <NavRow
          icon="bar-chart-outline"
          label="Player Statistics"
          onPress={() => router.push('/account/statistics')}
        />
        <View style={styles.divider} />
        <NavRow
          icon="settings-outline"
          label="Account Settings"
          onPress={() => router.push('/account/settings')}
        />
      </View>
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
    paddingBottom: Spacing.xxl,
  },
  playerHeader: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  playerName: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
  },
  emptySubtext: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  gameName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  gameStatus: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  navCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  navRowPressed: {
    backgroundColor: Colors.surfaceLight,
  },
  navIcon: {
    marginRight: Spacing.md,
  },
  navLabel: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: Spacing.md + 22 + Spacing.md,
  },
});
