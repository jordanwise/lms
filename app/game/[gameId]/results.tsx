import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { getGame, type GameDetail } from '@/lib/api';

const OUTCOME_ICONS: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
  win: { icon: 'checkmark-circle', color: Colors.success, label: 'Win' },
  loss: { icon: 'close-circle', color: Colors.error, label: 'Eliminated' },
  draw: { icon: 'remove-circle', color: Colors.warning, label: 'Eliminated' },
  postponed: { icon: 'time-outline', color: Colors.warning, label: 'Deferred' },
};

export default function ResultsScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const [game, setGame] = useState<GameDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGame = useCallback(() => {
    if (!gameId) return;
    setLoading(true);
    getGame(gameId).then(result => {
      if (result.ok) {
        setGame(result.data);
        setError(null);
      } else {
        setError(result.error);
      }
      setLoading(false);
    });
  }, [gameId]);

  useFocusEffect(
    useCallback(() => {
      loadGame();
    }, [loadGame])
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (error || !game) {
    return (
      <View style={styles.centered}>
        <Ionicons name="cloud-offline-outline" size={36} color={Colors.textMuted} />
        <Text style={styles.errorText}>{error ?? 'Game not found'}</Text>
      </View>
    );
  }

  const rounds = game.rounds ?? [];
  const picks = game.picks ?? [];
  const players = game.players ?? [];

  // Group picks by round for completed rounds
  const completedRounds = rounds.filter(r => r.state === 'complete');

  if (completedRounds.length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons name="football-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.emptyTitle}>No Completed Rounds</Text>
        <Text style={styles.emptyText}>Results will appear here once rounds are completed.</Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {completedRounds.map(round => {
          const roundPicks = picks.filter(p => p.roundNum === round.roundNum);

          return (
            <View key={round.roundNum} style={styles.roundSection}>
              <View style={styles.roundHeader}>
                <View>
                  <Text style={styles.roundTitle}>Round {round.roundNum}</Text>
                  <Text style={styles.roundSubtitle}>{round.matchday}</Text>
                </View>
                <View style={styles.stateBadge}>
                  <Ionicons name="checkmark-circle-outline" size={14} color={Colors.success} />
                  <Text style={styles.stateText}>Complete</Text>
                </View>
              </View>

              {roundPicks.length === 0 ? (
                <Text style={styles.noPicksText}>No picks recorded for this round.</Text>
              ) : (
                <View style={styles.picksList}>
                  {roundPicks.map((pick, i) => {
                    const player = players.find(p => p.userId === pick.userId);
                    const outcomeConfig = pick.outcome
                      ? OUTCOME_ICONS[pick.outcome]
                      : null;

                    return (
                      <View key={`${pick.userId}-${i}`} style={styles.pickRow}>
                        <View style={styles.playerInfo}>
                          <Text style={styles.playerName}>
                            {player?.displayName ?? pick.userId}
                          </Text>
                          <Text style={styles.teamName}>{pick.teamName}</Text>
                        </View>
                        {outcomeConfig ? (
                          <View style={styles.outcomeRow}>
                            <Ionicons name={outcomeConfig.icon} size={18} color={outcomeConfig.color} />
                            <Text style={[styles.outcomeText, { color: outcomeConfig.color }]}>
                              {outcomeConfig.label}
                            </Text>
                          </View>
                        ) : (
                          <Text style={styles.noOutcome}>Pending</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.background,
  },
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
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  errorText: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  roundSection: {
    marginBottom: Spacing.xl,
  },
  roundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  roundTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  roundSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  stateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success + '22',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  stateText: {
    fontSize: FontSize.sm - 2,
    fontWeight: '600',
    color: Colors.success,
  },
  noPicksText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  picksList: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  pickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  teamName: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  outcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  outcomeText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  noOutcome: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
});
