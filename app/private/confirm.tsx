import { View, Text, ScrollView, Alert, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

type ShareMethod = 'WhatsApp' | 'Text' | 'Messenger';

function ShareButton({ method, icon }: { method: ShareMethod; icon: keyof typeof Ionicons.glyphMap }) {
  const handleShare = () => {
    Alert.alert('Coming Soon', `Sharing via ${method} will be available soon.`);
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

export default function ConfirmPrivateGame() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    gameName: string;
    gamePin: string;
    fee: string;
    leagues: string;
    rollover: string;
    splitPot: string;
  }>();

  const leagues: string[] = params.leagues ? JSON.parse(params.leagues) : [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Success banner */}
      <View style={styles.banner}>
        <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
        <Text style={styles.bannerTitle}>Game Created!</Text>
      </View>

      {/* Summary card */}
      <View style={styles.card}>
        <SummaryRow label="Game Name" value={params.gameName ?? ''} />
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Game PIN</Text>
          <Text style={styles.pinValue}>{params.gamePin ?? ''}</Text>
        </View>
        <View style={styles.divider} />
        <SummaryRow label="Entry Fee" value={`£${params.fee ?? '0'}`} />
        <View style={styles.divider} />
        <SummaryRow label="Leagues" value={leagues.join(', ')} />
        <View style={styles.divider} />
        <SummaryRow label="Rollover" value={params.rollover === 'true' ? 'Yes' : 'No'} />
        <View style={styles.divider} />
        <SummaryRow label="Split Pot" value={params.splitPot === 'true' ? 'Yes' : 'No'} />
      </View>

      {/* Share section */}
      <Text style={styles.sectionTitle}>Share with friends</Text>

      <View style={styles.shareContainer}>
        <ShareButton method="WhatsApp" icon="logo-whatsapp" />
        <ShareButton method="Text" icon="chatbubble-outline" />
        <ShareButton method="Messenger" icon="paper-plane-outline" />
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
  banner: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  bannerTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.sm,
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

});
