import { useState, useCallback } from 'react';
import { View, Text, ScrollView, Alert, Share, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { getGame, leaveGame, restartGame, hideGame, type GameDetail, type RoundDetail, type PickDetail } from '@/lib/api';
import { getOrCreateUserId } from '@/lib/userId';

const STATE_LABEL: Record<string, string> = {
  waiting_for_players: 'Waiting for players',
  active: 'Active',
  completed: 'Completed',
  rollover_pending: 'Rollover pending',
  cancelled: 'Cancelled',
  abandoned: 'Abandoned',
};

const ROUND_STATE_CONFIG: Record<string, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  pending: { label: 'Pending', color: Colors.textMuted, icon: 'time-outline' },
  picking: { label: 'Picking', color: Colors.primary, icon: 'create-outline' },
  locked: { label: 'Locked', color: Colors.warning, icon: 'lock-closed-outline' },
  processing: { label: 'Processing', color: Colors.warning, icon: 'hourglass-outline' },
  complete: { label: 'Complete', color: Colors.success, icon: 'checkmark-circle-outline' },
};

const OUTCOME_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
  win: { icon: 'checkmark-circle', color: Colors.success, label: 'Survived' },
  loss: { icon: 'close-circle', color: Colors.error, label: 'Eliminated' },
  draw: { icon: 'remove-circle', color: Colors.warning, label: 'Eliminated' },
  postponed: { icon: 'time-outline', color: Colors.warning, label: 'Deferred' },
};

function ShareButton({ method, icon, message }: { method: string; icon: keyof typeof Ionicons.glyphMap; message: string }) {
  const handleShare = async () => {
    try {
      await Share.share({ message });
    } catch {
      // User cancelled or share failed — no action needed
    }
  };

  return (
    <Pressable style={styles.shareButton} onPress={handleShare}>
      <Ionicons name={icon} size={22} color={Colors.text} style={styles.shareIcon} />
      <Text style={styles.shareText}>Share via {method}</Text>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </Pressable>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function GameDetailScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const router = useRouter();
  const [game, setGame] = useState<GameDetail | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
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

  const isCreator = userId != null && game?.creatorId === userId;
  const rounds = game?.rounds ?? [];
  const picks = game?.picks ?? [];
  const completedRounds = rounds.filter(r => r.state === 'complete');

  const canLeave = game?.state === 'waiting_for_players' &&
    currentPlayer != null &&
    currentPlayer.status !== 'left';

  const isAbandoned = game?.state === 'abandoned';

  const [copied, setCopied] = useState(false);

  const handleCopyPin = async () => {
    if (!game?.pin) return;
    await Clipboard.setStringAsync(`PIN: ${game.pin}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = () => {
    Alert.alert(
      'Leave Game',
      'Are you sure you want to leave this game? Your entry fee will be refunded.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            const result = await leaveGame(gameId, userId!);
            setActionLoading(false);
            if (result.ok) {
              loadGame();
            } else {
              Alert.alert('Error', result.error);
            }
          },
        },
      ],
    );
  };

  const handleRestart = async () => {
    if (!userId || !gameId) return;
    setActionLoading(true);
    const result = await restartGame(gameId, userId);
    setActionLoading(false);
    if (result.ok) {
      loadGame();
    } else {
      Alert.alert('Error', result.error);
    }
  };

  const handleHide = () => {
    if (!userId || !gameId) return;
    Alert.alert(
      'Remove Game',
      'This will remove the game from your history. The game will remain in the system.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            const result = await hideGame(gameId, userId);
            setActionLoading(false);
            if (result.ok) {
              router.back();
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

  return (
    <View style={styles.flex}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Summary card */}
      <View style={styles.card}>
        <SummaryRow label="Game Name" value={game.name} />
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Game PIN</Text>
          <Pressable style={styles.pinRow} onPress={handleCopyPin}>
            <Text style={styles.pinValue}>{game.pin}</Text>
            <Ionicons
              name={copied ? 'checkmark' : 'copy-outline'}
              size={18}
              color={copied ? Colors.success : Colors.textMuted}
              style={styles.copyIcon}
            />
          </Pressable>
        </View>
        <View style={styles.divider} />
        <SummaryRow label="Status" value={STATE_LABEL[game.state] ?? game.state} />
        <View style={styles.divider} />
        <SummaryRow label="Entry Fee" value={`£${game.fee}`} />
        <View style={styles.divider} />
        <SummaryRow label="Prize Pool" value={`£${game.prizePool}`} />
        <View style={styles.divider} />
        <SummaryRow label="Players" value={String(game.playerCount)} />
        <View style={styles.divider} />
        <SummaryRow label="Leagues" value={game.leagues.join(', ')} />
        <View style={styles.divider} />
        <SummaryRow label="Rollover" value={game.rollover ? 'Yes' : 'No'} />
        <View style={styles.divider} />
        <SummaryRow label="Split Pot" value={game.splitPot ? 'Yes' : 'No'} />
      </View>

      {/* Round Status Banner */}
      {game.roundState && (
        <View style={[styles.roundBanner, { borderLeftColor: ROUND_STATE_CONFIG[game.roundState]?.color ?? Colors.textMuted }]}>
          <Ionicons
            name={ROUND_STATE_CONFIG[game.roundState]?.icon ?? 'help-circle-outline'}
            size={24}
            color={ROUND_STATE_CONFIG[game.roundState]?.color ?? Colors.textMuted}
          />
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>
              Round {game.currentRound}: {ROUND_STATE_CONFIG[game.roundState]?.label ?? game.roundState}
            </Text>
            {game.rounds && (() => {
              const currentRound = game.rounds.find(r => r.roundNum === game.currentRound);
              if (currentRound) {
                return <Text style={styles.bannerSubtext}>{currentRound.matchday}{currentRound.deadline ? ` · Deadline: ${currentRound.deadline}` : ''}</Text>;
              }
              return null;
            })()}
          </View>
        </View>
      )}

      {/* Game Outcome Banner */}
      {game.state === 'completed' && (
        <View style={styles.outcomeBanner}>
          <Ionicons name="trophy" size={36} color={Colors.warning} />
          <Text style={styles.outcomeTitle}>Game Over!</Text>
          {(() => {
            const winner = game.players.find(p => p.status === 'alive');
            return winner
              ? <Text style={styles.outcomeWinner}>Winner: {winner.displayName}</Text>
              : <Text style={styles.outcomeSubtext}>All players eliminated</Text>;
          })()}
        </View>
      )}

      {game.state === 'rollover_pending' && (
        <View style={[styles.outcomeBanner, styles.rolloverBanner]}>
          <Ionicons name="sync-outline" size={36} color={Colors.warning} />
          <Text style={styles.outcomeTitle}>Rollover Pending</Text>
          <Text style={styles.outcomeSubtext}>
            {game.rollover
              ? 'All players eliminated — pot rolls over to next game'
              : 'Waiting for rollover resolution'}
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionSection}>
        {isCreator && game.state === 'waiting_for_players' && (
          <Pressable
            style={styles.actionBtn}
            onPress={() => router.push(`/game/${gameId}/rounds`)}
          >
            <Ionicons name="add-circle-outline" size={20} color={Colors.text} />
            <Text style={styles.actionBtnText}>Add First Round</Text>
          </Pressable>
        )}

        {isCreator && game.state === 'active' && game.roundState === 'complete' && (
          <Pressable
            style={styles.actionBtn}
            onPress={() => router.push(`/game/${gameId}/rounds`)}
          >
            <Ionicons name="add-circle-outline" size={20} color={Colors.text} />
            <Text style={styles.actionBtnText}>Add Next Round</Text>
          </Pressable>
        )}

        {isCreator && (
          <Pressable
            style={[styles.actionBtn, styles.actionBtnSecondary]}
            onPress={() => router.push(`/game/${gameId}/rounds`)}
          >
            <Ionicons name="settings-outline" size={20} color={Colors.text} />
            <Text style={styles.actionBtnText}>Manage Rounds</Text>
          </Pressable>
        )}

        {game.state === 'active' && game.roundState === 'picking' && currentPlayer?.status === 'alive' && (
          <Pressable
            style={styles.actionBtn}
            onPress={() => router.push(`/game/${gameId}/pick`)}
          >
            <Ionicons name="create-outline" size={20} color={Colors.text} />
            <Text style={styles.actionBtnText}>Submit Pick</Text>
          </Pressable>
        )}

        {game.state === 'active' && game.roundState === 'locked' && (
          <View style={styles.statusNotice}>
            <Ionicons name="hourglass-outline" size={20} color={Colors.warning} />
            <Text style={styles.statusNoticeText}>Round in progress — waiting for results</Text>
          </View>
        )}
      </View>

      {/* Round History */}
      {rounds.length > 0 && completedRounds.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Round History</Text>
          {completedRounds.map(round => {
            const roundPicks = picks.filter(p => p.roundNum === round.roundNum);
            return (
              <Pressable
                key={round.roundNum}
                style={styles.roundHistoryCard}
                onPress={() => router.push(`/game/${gameId}/results`)}
              >
                <View style={styles.roundHistoryHeader}>
                  <View>
                    <Text style={styles.roundHistoryTitle}>Round {round.roundNum}</Text>
                    <Text style={styles.roundHistorySubtitle}>{round.matchday}</Text>
                  </View>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                </View>
                {roundPicks.length > 0 && (
                  <View style={styles.miniPicks}>
                    {roundPicks.slice(0, 3).map((p, i) => {
                      const outcomeConfig = p.outcome ? OUTCOME_CONFIG[p.outcome] : null;
                      return (
                        <View key={i} style={styles.miniPick}>
                          <Text style={styles.miniPickPlayer}>
                            {game.players.find(pl => pl.userId === p.userId)?.displayName ?? p.userId}:
                          </Text>
                          <Text style={styles.miniPickTeam}>{p.teamName}</Text>
                          {outcomeConfig && (
                            <Ionicons name={outcomeConfig.icon} size={12} color={outcomeConfig.color} />
                          )}
                        </View>
                      );
                    })}
                    {roundPicks.length > 3 && (
                      <Text style={styles.morePicks}>+{roundPicks.length - 3} more</Text>
                    )}
                  </View>
                )}
                <View style={styles.viewResultsRow}>
                  <Text style={styles.viewResultsText}>View full results</Text>
                  <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
                </View>
              </Pressable>
            );
          })}
        </>
      )}

      {/* Players */}
      {game.players.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Players ({game.playerCount})</Text>
          <View style={styles.card}>
            {game.players.map((p, i) => {
              const statusIcon = p.status === 'alive' ? { icon: 'checkmark-circle' as const, color: Colors.success, label: 'Alive' } :
                p.status === 'eliminated' ? { icon: 'close-circle' as const, color: Colors.error, label: 'Eliminated' } :
                p.status === 'deferred' ? { icon: 'time-outline' as const, color: Colors.warning, label: 'Deferred' } :
                { icon: 'help-circle-outline' as const, color: Colors.textMuted, label: p.status };
              return (
                <View key={p.userId}>
                  {i > 0 && <View style={styles.divider} />}
                  <View style={styles.standingsRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowLabel, p.status === 'eliminated' && styles.eliminated]}>
                        {p.displayName}
                      </Text>
                    </View>
                    <View style={styles.statusRow}>
                      <Ionicons name={statusIcon.icon} size={16} color={statusIcon.color} />
                      <Text style={[styles.statusLabel, { color: statusIcon.color }]}>
                        {statusIcon.label}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}

      {/* QR Code */}
      <Text style={styles.sectionTitle}>Scan to join</Text>
      <View style={styles.qrContainer}>
        <QRCode
          value={`lms://join/${game.pin}`}
          size={200}
          color={Colors.text}
          backgroundColor={Colors.surface}
        />
      </View>

      {/* Share */}
      <Text style={styles.sectionTitle}>Share with friends</Text>
      <View style={styles.shareContainer}>
        <ShareButton
          method="WhatsApp"
          icon="logo-whatsapp"
          message={`Join my Last Man Standing game! PIN: ${game.pin}\n\nlms://join/${game.pin}`}
        />
        <ShareButton
          method="Text"
          icon="chatbubble-outline"
          message={`Join my Last Man Standing game! PIN: ${game.pin}\n\nlms://join/${game.pin}`}
        />
        <ShareButton
          method="Messenger"
          icon="paper-plane-outline"
          message={`Join my Last Man Standing game! PIN: ${game.pin}\n\nlms://join/${game.pin}`}
        />
      </View>

      {/* Leave / Abandoned actions */}
      {canLeave && (
        <Pressable
          style={[styles.actionButton, styles.leaveButton, actionLoading && styles.buttonDisabled]}
          onPress={handleLeave}
          disabled={actionLoading}
        >
          {actionLoading
            ? <ActivityIndicator color={Colors.text} size="small" />
            : <Text style={styles.leaveButtonText}>Leave Game</Text>}
        </Pressable>
      )}

      {isAbandoned && (
        <View style={styles.abandonedActions}>
          <Text style={styles.abandonedNote}>
            This game has no players. You can restart it or remove it from your history.
          </Text>
          <Pressable
            style={[styles.actionButton, styles.restartButton, actionLoading && styles.buttonDisabled]}
            onPress={handleRestart}
            disabled={actionLoading}
          >
            {actionLoading
              ? <ActivityIndicator color={Colors.text} size="small" />
              : <Text style={styles.restartButtonText}>Restart Game</Text>}
          </Pressable>
          <Pressable
            style={[styles.actionButton, styles.removeButton, actionLoading && styles.buttonDisabled]}
            onPress={handleHide}
            disabled={actionLoading}
          >
            <Text style={styles.removeButtonText}>Remove from History</Text>
          </Pressable>
        </View>
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  rowLabel: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  rowValue: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: Spacing.md,
  },
  alive: {
    color: Colors.success,
  },
  pinRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  copyIcon: {
    marginLeft: Spacing.sm,
  },
  pinValue: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 3,
    fontFamily: 'SpaceMono',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  qrContainer: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  shareContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  shareIcon: {
    marginRight: Spacing.md,
  },
  shareText: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  abandonedActions: {
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  abandonedNote: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  actionButton: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  leaveButton: {
    backgroundColor: Colors.error,
    marginBottom: Spacing.xl,
  },
  leaveButtonText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: '#fff',
  },
  restartButton: {
    backgroundColor: Colors.primary,
  },
  restartButtonText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  removeButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  removeButtonText: {
    fontSize: FontSize.md,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  // Round status banner
  roundBanner: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    gap: Spacing.md,
    alignItems: 'center',
    borderLeftWidth: 3,
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
  // Outcome banners
  outcomeBanner: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  rolloverBanner: {
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  outcomeTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  outcomeWinner: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.warning,
  },
  outcomeSubtext: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  // Action buttons
  actionSection: {
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  actionBtnSecondary: {
    backgroundColor: Colors.surfaceLight,
  },
  actionBtnText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
  statusNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  statusNoticeText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  // Round history
  roundHistoryCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  roundHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  roundHistoryTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
  roundHistorySubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  miniPicks: {
    marginBottom: Spacing.sm,
    gap: 4,
  },
  miniPick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniPickPlayer: {
    fontSize: FontSize.sm - 2,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  miniPickTeam: {
    fontSize: FontSize.sm - 2,
    color: Colors.textMuted,
  },
  morePicks: {
    fontSize: FontSize.sm - 2,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  viewResultsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  viewResultsText: {
    fontSize: FontSize.sm - 2,
    color: Colors.primary,
    fontWeight: '600',
  },
  // Standings
  standingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  eliminated: {
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
  deferred: {
    color: Colors.warning,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});
