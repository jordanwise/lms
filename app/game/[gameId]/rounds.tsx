import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { getGame, addRound, openPicks, lockRound, submitResults, applyEliminations, type GameDetail } from '@/lib/api';
import { getOrCreateUserId } from '@/lib/userId';

const LEAGUES = [
  { id: 'PL', name: 'Premier League' },
  { id: 'LL', name: 'La Liga' },
  { id: 'SA', name: 'Serie A' },
  { id: 'BL1', name: 'Bundesliga' },
  { id: 'FL1', name: 'Ligue 1' },
];

const ROUND_STATE_CONFIG: Record<string, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  pending: { label: 'Pending', color: Colors.textMuted, icon: 'time-outline' },
  picking: { label: 'Picking', color: Colors.primary, icon: 'create-outline' },
  locked: { label: 'Locked', color: Colors.warning, icon: 'lock-closed-outline' },
  processing: { label: 'Processing', color: Colors.warning, icon: 'hourglass-outline' },
  complete: { label: 'Complete', color: Colors.success, icon: 'checkmark-circle-outline' },
};

export default function RoundsScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const router = useRouter();
  const [game, setGame] = useState<GameDetail | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [selectedLeague, setSelectedLeague] = useState(LEAGUES[0].id);
  const [matchday, setMatchday] = useState('');
  const [deadline, setDeadline] = useState('');

  useFocusEffect(
    useCallback(() => {
      getOrCreateUserId().then(setUserId);
    }, [])
  );

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

  const handleAddRound = async () => {
    if (!matchday.trim()) {
      Alert.alert('Error', 'Matchday is required');
      return;
    }
    setActionLoading('add');
    const result = await addRound(gameId, matchday.trim(), selectedLeague, deadline.trim() || undefined);
    setActionLoading(null);
    if (result.ok) {
      setMatchday('');
      setDeadline('');
      loadGame();
    } else {
      Alert.alert('Error', result.error);
    }
  };

  const handleOpenPicks = (roundNum: number) => {
    Alert.alert('Open Picks', `Open picks for Round ${roundNum}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Open',
        onPress: async () => {
          setActionLoading(`open-${roundNum}`);
          const result = await openPicks(gameId, roundNum);
          setActionLoading(null);
          if (result.ok) {
            loadGame();
          } else {
            Alert.alert('Error', result.error);
          }
        },
      },
    ]);
  };

  const handleLockRound = (roundNum: number) => {
    Alert.alert('Lock Round', `Lock Round ${roundNum}? No more picks can be submitted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Lock',
        onPress: async () => {
          setActionLoading(`lock-${roundNum}`);
          const result = await lockRound(gameId, roundNum);
          setActionLoading(null);
          if (result.ok) {
            loadGame();
          } else {
            Alert.alert('Error', result.error);
          }
        },
      },
    ]);
  };

  const handleSubmitResults = (roundNum: number) => {
    if (!game?.picks) return;
    const roundPicks = game.picks.filter(p => p.roundNum === roundNum);
    const uniqueTeams = [...new Set(roundPicks.map(p => p.teamId))];

    const buttons: Array<{ text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }> = uniqueTeams.map(teamId => {
      const pick = roundPicks.find(p => p.teamId === teamId);
      return {
        text: `${pick?.teamName ?? teamId}: Win`,
        onPress: async () => {
          setActionLoading(`result-${roundNum}`);
          const results = uniqueTeams.map(tid => ({
            teamId: tid,
            outcome: tid === teamId ? 'win' : 'loss',
          }));
          const result = await submitResults(gameId, roundNum, results);
          setActionLoading(null);
          if (result.ok) {
            loadGame();
          } else {
            Alert.alert('Error', result.error);
          }
        },
      };
    });

    buttons.push({
      text: 'All Draws',
      onPress: async () => {
        setActionLoading(`result-${roundNum}`);
        const results = uniqueTeams.map(tid => ({ teamId: tid, outcome: 'draw' }));
        const r = await submitResults(gameId, roundNum, results);
        setActionLoading(null);
        if (r.ok) {
          loadGame();
        } else {
          Alert.alert('Error', r.error);
        }
      },
    });

    buttons.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert(
      'Submit Results',
      `Mark outcomes for Round ${roundNum}`,
      buttons,
    );
  };

  const handleEliminate = (roundNum: number) => {
    Alert.alert('Apply Eliminations', `Eliminate players with losing picks for Round ${roundNum}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Apply',
        onPress: async () => {
          setActionLoading(`elim-${roundNum}`);
          const result = await applyEliminations(gameId, roundNum);
          setActionLoading(null);
          if (result.ok) {
            loadGame();
          } else {
            Alert.alert('Error', result.error);
          }
        },
      },
    ]);
  };

  const isCreator = userId && game?.creatorId === userId;
  const canAddRound = isCreator &&
    (game?.state === 'waiting_for_players' || game?.state === 'active');

  // Only show add round form if no active round
  const activeRound = game?.rounds?.some(r => r.state !== 'complete');
  const showAddForm = canAddRound && !activeRound;

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

  if (!isCreator) {
    return (
      <View style={styles.centered}>
        <Ionicons name="lock-closed-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.errorText}>Only the game creator can manage rounds</Text>
      </View>
    );
  }

  const rounds = game.rounds ?? [];

  return (
    <View style={styles.flex}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Add Round Form */}
        {showAddForm && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Add Round</Text>

            <Text style={styles.label}>LEAGUE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.leagueScroll}>
              {LEAGUES.map(league => (
                <Pressable
                  key={league.id}
                  style={[
                    styles.leagueChip,
                    selectedLeague === league.id && styles.leagueChipSelected,
                  ]}
                  onPress={() => setSelectedLeague(league.id)}
                >
                  <Text
                    style={[
                      styles.leagueChipText,
                      selectedLeague === league.id && styles.leagueChipTextSelected,
                    ]}
                  >
                    {league.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.label}>MATCHDAY</Text>
            <TextInput
              style={styles.input}
              value={matchday}
              onChangeText={setMatchday}
              placeholder="e.g. GW31"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="characters"
            />

            <Text style={styles.label}>DEADLINE (OPTIONAL)</Text>
            <TextInput
              style={styles.input}
              value={deadline}
              onChangeText={setDeadline}
              placeholder="e.g. 2026-08-10T12:00:00Z"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
            />

            <Pressable
              style={[styles.addButton, actionLoading === 'add' && styles.buttonDisabled]}
              onPress={handleAddRound}
              disabled={actionLoading === 'add'}
            >
              {actionLoading === 'add' ? (
                <ActivityIndicator color={Colors.text} />
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={20} color={Colors.text} />
                  <Text style={styles.addButtonText}>Add Round</Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        {/* Round List */}
        <Text style={styles.sectionTitle}>Rounds ({rounds.length})</Text>
        {rounds.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="football-outline" size={36} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No rounds yet. Add the first round to get started.</Text>
          </View>
        ) : (
          rounds.map((round, i) => {
            const stateConfig = ROUND_STATE_CONFIG[round.state] ?? { label: round.state, color: Colors.textMuted, icon: 'help-outline' as const };
            const isLoading = actionLoading !== null;

            return (
              <View key={round.roundNum} style={styles.roundCard}>
                <View style={styles.roundHeader}>
                  <View style={styles.roundInfo}>
                    <Text style={styles.roundNum}>Round {round.roundNum}</Text>
                    <Text style={styles.roundMatchday}>
                      {round.matchday} · {LEAGUES.find(l => l.id === round.leagueId)?.name ?? round.leagueId}
                    </Text>
                  </View>
                  <View style={[styles.stateBadge, { backgroundColor: stateConfig.color + '22', borderColor: stateConfig.color }]}>
                    <Ionicons name={stateConfig.icon} size={14} color={stateConfig.color} />
                    <Text style={[styles.stateText, { color: stateConfig.color }]}>{stateConfig.label}</Text>
                  </View>
                </View>

                {round.deadline && (
                  <View style={styles.deadlineRow}>
                    <Ionicons name="alarm-outline" size={14} color={Colors.textMuted} />
                    <Text style={styles.deadlineText}>Deadline: {round.deadline}</Text>
                  </View>
                )}

                {/* Action buttons */}
                <View style={styles.actions}>
                  {round.state === 'pending' && (
                    <Pressable
                      style={[styles.actionBtn, isLoading && styles.buttonDisabled]}
                      onPress={() => handleOpenPicks(round.roundNum)}
                      disabled={isLoading}
                    >
                      {actionLoading === `open-${round.roundNum}` ? (
                        <ActivityIndicator color={Colors.text} size="small" />
                      ) : (
                        <Text style={styles.actionBtnText}>Open Picks</Text>
                      )}
                    </Pressable>
                  )}

                  {round.state === 'picking' && (
                    <Pressable
                      style={[styles.actionBtn, styles.warningBtn, isLoading && styles.buttonDisabled]}
                      onPress={() => handleLockRound(round.roundNum)}
                      disabled={isLoading}
                    >
                      {actionLoading === `lock-${round.roundNum}` ? (
                        <ActivityIndicator color={Colors.text} size="small" />
                      ) : (
                        <Text style={styles.actionBtnText}>Lock Round</Text>
                      )}
                    </Pressable>
                  )}

                  {round.state === 'locked' && (
                    <Pressable
                      style={[styles.actionBtn, styles.warningBtn, isLoading && styles.buttonDisabled]}
                      onPress={() => handleSubmitResults(round.roundNum)}
                      disabled={isLoading}
                    >
                      {actionLoading === `result-${round.roundNum}` ? (
                        <ActivityIndicator color={Colors.text} size="small" />
                      ) : (
                        <Text style={styles.actionBtnText}>Submit Results</Text>
                      )}
                    </Pressable>
                  )}

                  {round.state === 'processing' && (
                    <Pressable
                      style={[styles.actionBtn, styles.dangerBtn, isLoading && styles.buttonDisabled]}
                      onPress={() => handleEliminate(round.roundNum)}
                      disabled={isLoading}
                    >
                      {actionLoading === `elim-${round.roundNum}` ? (
                        <ActivityIndicator color={Colors.text} size="small" />
                      ) : (
                        <Text style={styles.actionBtnText}>Apply Eliminations</Text>
                      )}
                    </Pressable>
                  )}

                  {round.state === 'complete' && game?.picks && (
                    <View style={styles.completeActions}>
                      <Text style={styles.outcomeSummary}>
                        {game.picks
                          .filter(p => p.roundNum === round.roundNum)
                          .map(p => `${p.teamName}: ${p.outcome ?? 'no result'}`)
                          .join(' · ')}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
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
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  errorText: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  cardTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.divider,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  leagueScroll: {
    marginBottom: Spacing.sm,
  },
  leagueChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.divider,
    marginRight: Spacing.sm,
  },
  leagueChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  leagueChipText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  leagueChipTextSelected: {
    color: Colors.text,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  addButtonText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  roundCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  roundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  roundInfo: {
    flex: 1,
  },
  roundNum: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  roundMatchday: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  stateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: 4,
  },
  stateText: {
    fontSize: FontSize.sm - 2,
    fontWeight: '600',
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.sm,
  },
  deadlineText: {
    fontSize: FontSize.sm - 2,
    color: Colors.textMuted,
  },
  actions: {
    marginTop: Spacing.sm,
  },
  actionBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
  },
  warningBtn: {
    backgroundColor: Colors.warning,
  },
  dangerBtn: {
    backgroundColor: Colors.error,
  },
  actionBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  completeActions: {
    marginTop: Spacing.sm,
  },
  outcomeSummary: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
});
