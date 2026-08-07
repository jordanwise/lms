import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { getGame, submitPick, type GameDetail, type PickDetail } from '@/lib/api';
import { getOrCreateUserId } from '@/lib/userId';

const AVAILABLE_TEAMS = [
  'Arsenal',
  'Aston Villa',
  'Bournemouth',
  'Brentford',
  'Brighton',
  'Chelsea',
  'Crystal Palace',
  'Everton',
  'Fulham',
  'Ipswich Town',
  'Leicester City',
  'Liverpool',
  'Manchester City',
  'Manchester United',
  'Newcastle United',
  'Nottingham Forest',
  'Southampton',
  'Tottenham Hotspur',
  'West Ham United',
  'Wolverhampton',
];

const TEAM_IDS: Record<string, string> = {
  'Arsenal': 'arsenal',
  'Aston Villa': 'aston-villa',
  'Bournemouth': 'bournemouth',
  'Brentford': 'brentford',
  'Brighton': 'brighton',
  'Chelsea': 'chelsea',
  'Crystal Palace': 'crystal-palace',
  'Everton': 'everton',
  'Fulham': 'fulham',
  'Ipswich Town': 'ipswich-town',
  'Leicester City': 'leicester-city',
  'Liverpool': 'liverpool',
  'Manchester City': 'manchester-city',
  'Manchester United': 'manchester-united',
  'Newcastle United': 'newcastle-united',
  'Nottingham Forest': 'nottingham-forest',
  'Southampton': 'southampton',
  'Tottenham Hotspur': 'tottenham-hotspur',
  'West Ham United': 'west-ham-united',
  'Wolverhampton': 'wolverhampton',
};

export default function PickScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const router = useRouter();
  const [game, setGame] = useState<GameDetail | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const currentPlayer = game && userId
    ? game.players.find(p => p.userId === userId)
    : null;

  const currentRound = game?.currentRound ?? null;
  const roundState = game?.roundState;
  const picks = game?.picks ?? [];

  // Teams already picked by this user in any round
  const previouslyPickedTeams = new Set(
    picks
      .filter((p: PickDetail) => p.userId === userId)
      .map((p: PickDetail) => p.teamName)
  );

  // Has the user already picked for the current round?
  const currentRoundPick = picks.find(
    (p: PickDetail) => p.roundNum === currentRound && p.userId === userId
  );

  const canPick =
    game?.state === 'active' &&
    roundState === 'picking' &&
    currentPlayer?.status === 'alive' &&
    !currentRoundPick;

  const handlePick = (teamName: string) => {
    if (!canPick || !currentRound) return;

    const teamId = TEAM_IDS[teamName] ?? teamName.toLowerCase().replace(/\s+/g, '-');

    Alert.alert(
      'Confirm Pick',
      `Pick ${teamName} for Round ${currentRound}? This cannot be changed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setSubmitting(true);
            const result = await submitPick(
              gameId,
              currentRound,
              userId!,
              teamId,
              teamName,
            );
            setSubmitting(false);
            if (result.ok) {
              Alert.alert('Pick Submitted', `You picked ${teamName}! Good luck!`, [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } else {
              Alert.alert('Error', result.error);
            }
          },
        },
      ],
    );
  };

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

  // Already picked for this round
  if (currentRoundPick) {
    return (
      <View style={styles.centered}>
        <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
        <Text style={styles.pickedTitle}>Pick Submitted!</Text>
        <Text style={styles.pickedTeam}>{currentRoundPick.teamName}</Text>
        {currentRoundPick.outcome && (
          <View style={[styles.outcomeBadge, {
            backgroundColor: currentRoundPick.outcome === 'win'
              ? Colors.success
              : currentRoundPick.outcome === 'draw'
              ? Colors.warning
              : Colors.error,
          }]}>
            <Text style={styles.outcomeText}>
              {currentRoundPick.outcome.toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={styles.pickedSubtext}>
          Your pick has been locked in. Check back after the round for results.
        </Text>
      </View>
    );
  }

  // Cannot pick right now
  if (!canPick) {
    let reason = 'Picks are not currently open.';
    if (game.state !== 'active') {
      reason = 'The game is not currently active.';
    } else if (roundState !== 'picking') {
      reason = `Round state is "${roundState ?? 'unknown'}" — picks are only available during the picking phase.`;
    } else if (currentPlayer?.status !== 'alive') {
      reason = `Your status is "${currentPlayer?.status ?? 'unknown'}" — only alive players can submit picks.`;
    }

    return (
      <View style={styles.centered}>
        <Ionicons name="lock-closed-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.cannotPickTitle}>Cannot Submit Pick</Text>
        <Text style={styles.cannotPickReason}>{reason}</Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Round Info Banner */}
        <View style={styles.banner}>
          <Ionicons name="create-outline" size={24} color={Colors.primary} />
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>Round {currentRound} — Submit Your Pick</Text>
            <Text style={styles.bannerSubtext}>Choose a team you think will win. You can only pick each team once.</Text>
          </View>
        </View>

        {/* Previously picked teams */}
        {previouslyPickedTeams.size > 0 && (
          <View style={styles.previousSection}>
            <Text style={styles.previousLabel}>PREVIOUSLY PICKED</Text>
            <Text style={styles.previousTeams}>
              {[...previouslyPickedTeams].join(' · ')}
            </Text>
          </View>
        )}

        {/* Team list */}
        <Text style={styles.sectionTitle}>Available Teams</Text>
        <View style={styles.teamGrid}>
          {AVAILABLE_TEAMS.map(team => {
            const isUsed = previouslyPickedTeams.has(team);
            return (
              <Pressable
                key={team}
                style={[
                  styles.teamCard,
                  isUsed && styles.teamCardDisabled,
                  submitting && styles.teamCardDisabled,
                ]}
                onPress={() => !isUsed && !submitting && handlePick(team)}
                disabled={isUsed || submitting}
              >
                <View style={styles.teamCardContent}>
                  <Text style={[styles.teamName, isUsed && styles.teamNameDisabled]}>
                    {team}
                  </Text>
                  {isUsed ? (
                    <View style={styles.usedBadge}>
                      <Ionicons name="checkmark-circle" size={14} color={Colors.textMuted} />
                      <Text style={styles.usedText}>Used</Text>
                    </View>
                  ) : (
                    <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Loading overlay */}
      {submitting && (
        <View style={styles.overlay}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.overlayText}>Submitting pick...</Text>
        </View>
      )}
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
  banner: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    gap: Spacing.md,
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  bannerSubtext: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  previousSection: {
    marginBottom: Spacing.lg,
  },
  previousLabel: {
    fontSize: FontSize.sm - 2,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  previousTeams: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  teamGrid: {
    gap: Spacing.sm,
  },
  teamCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  teamCardDisabled: {
    opacity: 0.4,
  },
  teamCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  teamNameDisabled: {
    color: Colors.textMuted,
  },
  usedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  usedText: {
    fontSize: FontSize.sm - 2,
    color: Colors.textMuted,
  },
  pickedTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  pickedTeam: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.primary,
  },
  pickedSubtext: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  outcomeBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
  },
  outcomeText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  cannotPickTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  cannotPickReason: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  overlayText: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: '600',
  },
});
