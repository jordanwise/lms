import { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { FormInput } from '@/components/ui/FormInput';
import { FeeStepper } from '@/components/ui/FeeStepper';
import { Checkbox } from '@/components/ui/Checkbox';
import { LeagueSelector } from '@/components/ui/LeagueSelector';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Colors, Spacing, FontSize } from '@/constants/theme';

function generatePin(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let pin = '';
  for (let i = 0; i < 8; i++) {
    pin += chars[Math.floor(Math.random() * chars.length)];
  }
  return pin;
}

export default function CreatePrivateGame() {
  const router = useRouter();
  const [gameName, setGameName] = useState('');
  const gamePin = useMemo(() => generatePin(), []);
  const [fee, setFee] = useState(5);
  const [leagues, setLeagues] = useState<string[]>([]);
  const [rollover, setRollover] = useState(false);
  const [splitPot, setSplitPot] = useState(false);

  const isValid = gameName.trim().length > 0
    && fee >= 5
    && leagues.length > 0;

  const handleCreate = () => {
    if (!isValid) return;
    router.push({
      pathname: '/private/confirm',
      params: {
        gameName,
        gamePin,
        fee: String(fee),
        leagues: JSON.stringify(leagues),
        rollover: String(rollover),
        splitPot: String(splitPot),
      },
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <FormInput
          label="Game Name"
          value={gameName}
          onChangeText={setGameName}
          placeholder="Enter game name..."
          maxLength={32}
        />

        <View style={styles.pinContainer}>
          <Text style={styles.pinLabel}>GAME PIN</Text>
          <Text style={styles.pinValue}>{gamePin}</Text>
        </View>

        <FeeStepper value={fee} onChange={setFee} />

        <LeagueSelector selected={leagues} onChanged={setLeagues} />

        <View style={styles.checkboxRow}>
          <Checkbox
            checked={rollover}
            label="Rollover"
            onToggle={() => setRollover(!rollover)}
          />
          <Checkbox
            checked={splitPot}
            label="Split Pot"
            onToggle={() => setSplitPot(!splitPot)}
          />
        </View>

        <View style={styles.buttonContainer}>
          <PrimaryButton
            label="Create Private Game"
            onPress={handleCreate}
            disabled={!isValid}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  pinContainer: {
    marginBottom: Spacing.lg,
  },
  pinLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  pinValue: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 4,
    fontFamily: 'SpaceMono',
  },
  checkboxRow: {
    flexDirection: 'row',
    marginBottom: Spacing.xl,
  },
  buttonContainer: {
    marginTop: Spacing.md,
  },
});
