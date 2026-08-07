import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { getOrCreateUserId } from '@/lib/userId';
import { listUserGames, getGame, type UserGame } from '@/lib/api';

const HISTORY_STATES = new Set(['completed', 'cancelled', 'abandoned']);

const STATE_LABEL: Record<string, string> = {
  waiting_for_players: 'Waiting',
  active: 'Active',
  completed: 'Completed',
  rollover_pending: 'Rollover',
  cancelled: 'Cancelled',
  abandoned: 'Abandoned',
};

const STATE_COLOR: Record<string, string> = {
  waiting_for_players: Colors.warning,
  active: Colors.primary,
  completed: Colors.success,
  rollover_pending: Colors.warning,
  cancelled: Colors.textMuted,
  abandoned: Colors.error,
};

function getOutcome(gameState: string, playerStatus: string): string {
  if (gameState === 'cancelled') return 'Cancelled';
  if (gameState === 'abandoned') return 'Abandoned';
  if (playerStatus === 'alive') return 'Won 🏆';
  if (playerStatus === 'eliminated') return 'Eliminated';
  return playerStatus;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export default function GameHistoryScreen() {
  const router = useRouter();
  const [historyGames, setHistoryGames] = useState<(UserGame & { freshState?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const userId = await getOrCreateUserId();
      const result = await listUserGames(userId);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      const allGames = result.data.games;
      const history = allGames.filter((g) => HISTORY_STATES.has(g.gameState));

      // Fetch fresh game state for each history game to fix stale denormalized state
      const freshGames = await Promise.all(
        history.map(async (g) => {
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

      setHistoryGames(freshGames);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory]),
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
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.centeredContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadHistory(true)} tintColor={Colors.primary} />}
      >
        <Ionicons name="cloud-offline-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.errorText}>Couldn't load history</Text>
        <Text style={styles.errorSubtext}>{error}</Text>
      </ScrollView>
    );
  }

  if (historyGames.length === 0) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.centeredContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadHistory(true)} tintColor={Colors.primary} />}
      >
        <Ionicons name="time-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.emptyTitle}>No game history yet</Text>
        <Text style={styles.emptySubtitle}>
          Your completed and cancelled games will appear here
        </Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadHistory(true)} tintColor={Colors.primary} />}
    >
      <Text style={styles.sectionTitle}>
        Past Games ({historyGames.length})
      </Text>

      {historyGames.map((game) => {
        const state = game.freshState ?? game.gameState;
        const outcome = getOutcome(state, game.playerStatus);
        const stateColor = STATE_COLOR[state] ?? Colors.textMuted;

        return (
          <Pressable
            key={game.gameId}
            style={({ pressed }) => [styles.gameCard, pressed && { opacity: 0.7 }]}
            onPress={() => router.push(`/game/${game.gameId}`)}
          >
            <View style={styles.cardTop}>
              <View style={styles.cardInfo}>
                <Text style={styles.gameName} numberOfLines={1}>
                  {game.gameName}
                </Text>
                <Text style={styles.joinedDate}>
                  Joined {formatDate(game.joinedAt)}
                </Text>
              </View>
              <View style={[styles.stateBadge, { backgroundColor: stateColor + '22', borderColor: stateColor }]}>
                <Text style={[styles.stateBadgeText, { color: stateColor }]}>
                  {STATE_LABEL[state] ?? state}
                </Text>
              </View>
            </View>
            <View style={styles.cardBottom}>
              <View style={styles.outcomeRow}>
                <Ionicons
                  name={outcome === 'Won 🏆' ? 'trophy-outline' : 'flag-outline'}
                  size={16}
                  color={outcome === 'Won 🏆' ? Colors.warning : Colors.textSecondary}
                />
                <Text style={[
                  styles.outcomeText,
                  outcome === 'Won 🏆' && { color: Colors.warning },
                ]}>
                  {outcome}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </View>
          </Pressable>
        );
      })}
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
  centered: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  gameCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  cardInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  gameName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  joinedDate: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  stateBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  stateBadgeText: {
    fontSize: FontSize.sm - 1,
    fontWeight: '600',
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  outcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  outcomeText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
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
    marginTop: Spacing.xs,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});
