import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { getOrCreateUserId } from '@/lib/userId';
import { listUserGames, type UserGame } from '@/lib/api';

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
};

export default function AccountScreen() {
  const router = useRouter();
  const [games, setGames] = useState<UserGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError(null);

      getOrCreateUserId()
        .then(userId => listUserGames(userId))
        .then(result => {
          if (!active) return;
          if (result.ok) {
            setGames(result.data.games);
          } else {
            setError(result.error);
          }
        })
        .finally(() => { if (active) setLoading(false); });

      return () => { active = false; };
    }, []),
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
          <View key={game.gameId} style={styles.gameCard}>
            <View>
              <Text style={styles.gameName}>{game.gameName}</Text>
              <Text style={styles.gameStatus}>
                {STATUS_LABEL[game.gameState] ?? game.gameState}
                {' · '}
                {game.playerStatus}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </View>
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
