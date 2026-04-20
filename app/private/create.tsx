import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { FormInput } from '@/components/ui/FormInput';
import { FeeStepper } from '@/components/ui/FeeStepper';
import { Checkbox } from '@/components/ui/Checkbox';
import { LeagueSelector } from '@/components/ui/LeagueSelector';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Colors, Spacing, FontSize } from '@/constants/theme';
import { getOrCreateUserId } from '@/lib/userId';
import { createGame } from '@/lib/api';

export default function CreatePrivateGame() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [gameName, setGameName] = useState('');
  const [fee, setFee] = useState(5);
  const [leagues, setLeagues] = useState<string[]>([]);
  const [rollover, setRollover] = useState(false);
  const [splitPot, setSplitPot] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getOrCreateUserId().then(setUserId);
  }, []);

  const isValid =
    !!userId &&
    displayName.trim().length > 0 &&
    gameName.trim().length > 0 &&
    fee >= 5 &&
    leagues.length > 0;

  const handleCreate = async () => {
    if (!isValid || loading) return;
    setLoading(true);
    try {
      const result = await createGame({
        name: gameName,
        fee,
        leagues,
        rollover,
        splitPot,
        creatorId: userId!,
        creatorDisplayName: displayName,
      });

      if (!result.ok) {
        Alert.alert('Failed to create game', result.error);
        return;
      }

      router.push({
        pathname: '/private/confirm',
        params: {
          gameName: result.data.name,
          gamePin: result.data.pin,
          fee: String(result.data.fee),
          leagues: JSON.stringify(result.data.leagues),
          rollover: String(result.data.rollover),
          splitPot: String(result.data.splitPot),
        },
      });
    } finally {
      setLoading(false);
    }
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
          label="Your Name"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="What should other players call you?"
          maxLength={32}
        />

        <FormInput
          label="Game Name"
          value={gameName}
          onChangeText={setGameName}
          placeholder="Enter game name..."
          maxLength={32}
        />

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
            label={loading ? 'Creating...' : 'Create Private Game'}
            onPress={handleCreate}
            disabled={!isValid || loading}
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
  checkboxRow: {
    flexDirection: 'row',
    marginBottom: Spacing.xl,
  },
  buttonContainer: {
    marginTop: Spacing.md,
  },
});
