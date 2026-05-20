import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Alert, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { getGame, leaveGame, restartGame, hideGame, type GameDetail } from '@/lib/api';
import { getOrCreateUserId } from '@/lib/userId';

const STATE_LABEL: Record<string, string> = {
  waiting_for_players: 'Waiting for players',
  active: 'Active',
  completed: 'Completed',
  rollover_pending: 'Rollover pending',
  cancelled: 'Cancelled',
  abandoned: 'Abandoned',
};

type ShareMethod = 'WhatsApp' | 'Text' | 'Messenger';

function ShareButton({ method, icon }: { method: ShareMethod; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <Pressable
      style={styles.shareButton}
      onPress={() => Alert.alert('Coming Soon', `Sharing via ${method} will be available soon.`)}
    >
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

  useEffect(() => {
    getOrCreateUserId().then(setUserId);
  }, []);

  const loadGame = () => {
    if (!gameId) return;
    getGame(gameId).then(result => {
      if (result.ok) {
        setGame(result.data);
      } else {
        setError(result.error);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    loadGame();
  }, [gameId]);

  const currentPlayer = game && userId
    ? game.players.find(p => p.userId === userId)
    : null;

  const canLeave = game?.state === 'waiting_for_players' &&
    currentPlayer != null &&
    currentPlayer.status !== 'left';

  const isAbandoned = game?.state === 'abandoned';

  const [copied, setCopied] = useState(false);

  const handleCopyPin = async () => {
    if (!game?.pin) return;
    await Clipboard.setStringAsync(game.pin);
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

      {/* Players */}
      {game.players.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Players ({game.playerCount})</Text>
          <View style={styles.card}>
            {game.players.map((p, i) => (
              <View key={p.userId}>
                {i > 0 && <View style={styles.divider} />}
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>{p.displayName}</Text>
                  <Text style={[styles.rowValue, p.status === 'alive' && styles.alive]}>
                    {p.status}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Share */}
      <Text style={styles.sectionTitle}>Share with friends</Text>
      <View style={styles.shareContainer}>
        <ShareButton method="WhatsApp" icon="logo-whatsapp" />
        <ShareButton method="Text" icon="chatbubble-outline" />
        <ShareButton method="Messenger" icon="paper-plane-outline" />
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
});
