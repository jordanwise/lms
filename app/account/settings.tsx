import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { FormInput } from '@/components/ui/FormInput';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Colors, Spacing, FontSize } from '@/constants/theme';
import { getDisplayName, saveDisplayName } from '@/lib/userId';

export default function AccountSettingsScreen() {
  const [name, setName] = useState('');
  const [saved, setSaved] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getDisplayName().then(setName);
      setSaved(false);
    }, [])
  );

  const handleSave = async () => {
    await saveDisplayName(name);
    setSaved(true);
    Alert.alert('Saved', 'Your display name has been updated.');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Display Name</Text>
      <Text style={styles.hint}>
        This name is shown to other players in games you create or join.
      </Text>
      <FormInput
        label=""
        value={name}
        onChangeText={text => { setName(text); setSaved(false); }}
        placeholder="lms_admin"
        maxLength={32}
      />
      <PrimaryButton
        label={saved ? 'Saved ✓' : 'Save'}
        onPress={handleSave}
        disabled={!name.trim() || saved}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  label: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  hint: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.lg,
  },
});

