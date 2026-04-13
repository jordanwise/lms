import { useState } from 'react';
import { View, Text, Pressable, TextInput, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

const MIN = 5;
const MAX = 200;
const STEP = 5;

type FeeStepperProps = {
  value: number;
  onChange: (value: number) => void;
};

export function FeeStepper({ value, onChange }: FeeStepperProps) {
  const [customMode, setCustomMode] = useState(false);
  const [customText, setCustomText] = useState('');

  const decrement = () => {
    if (customMode) {
      setCustomMode(false);
      onChange(MAX);
      return;
    }
    onChange(Math.max(MIN, value - STEP));
  };

  const increment = () => {
    if (value < MAX) {
      onChange(Math.min(MAX, value + STEP));
    }
  };

  const enableCustom = () => {
    setCustomText('');
    setCustomMode(true);
  };

  const confirmCustom = (text: string) => {
    const num = parseInt(text, 10);
    if (!num || num <= MAX) {
      setCustomMode(false);
      onChange(num && num >= MIN ? Math.round(num / STEP) * STEP : MAX);
      return;
    }
    Alert.alert(
      'High Entry Fee',
      `£${num} exceeds the standard maximum of £${MAX}. Are you sure?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            setCustomMode(false);
            onChange(MAX);
          },
        },
        {
          text: 'Confirm',
          onPress: () => {
            setCustomMode(false);
            onChange(num);
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>ADMISSION FEE</Text>

      {customMode ? (
        <View style={styles.customRow}>
          <View style={styles.prefixBox}>
            <Text style={styles.prefixText}>£</Text>
          </View>
          <TextInput
            style={styles.customInput}
            value={customText}
            onChangeText={setCustomText}
            keyboardType="numeric"
            placeholder="Enter amount"
            placeholderTextColor={Colors.textMuted}
            autoFocus
            onSubmitEditing={() => confirmCustom(customText)}
            onBlur={() => confirmCustom(customText)}
          />
        </View>
      ) : (
        <View style={styles.stepperRow}>
          <Pressable
            style={[styles.stepButton, value <= MIN && styles.stepButtonDisabled]}
            onPress={decrement}
            disabled={value <= MIN}
          >
            <Ionicons name="remove" size={24} color={value <= MIN ? Colors.textMuted : Colors.text} />
          </Pressable>

          <View style={styles.valueBox}>
            <Text style={styles.valueText}>£{value}</Text>
          </View>

          <Pressable
            style={[styles.stepButton, value >= MAX && styles.stepButtonDisabled]}
            onPress={increment}
            disabled={value >= MAX}
          >
            <Ionicons name="add" size={24} color={value >= MAX ? Colors.textMuted : Colors.text} />
          </Pressable>
        </View>
      )}

      {!customMode && (
        <Pressable onPress={enableCustom} style={styles.customLink}>
          <Text style={styles.customLinkText}>
            {value > MAX ? `Custom: £${value}` : 'Enter custom amount'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    letterSpacing: 1,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  stepButton: {
    width: 48,
    height: 48,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.divider,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepButtonDisabled: {
    opacity: 0.4,
  },
  valueBox: {
    flex: 1,
    height: 48,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.divider,
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueText: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  customLink: {
    marginTop: Spacing.sm,
    alignSelf: 'flex-end',
  },
  customLinkText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  prefixBox: {
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    borderTopLeftRadius: BorderRadius.md,
    borderBottomLeftRadius: BorderRadius.md,
    borderWidth: 1,
    borderRightWidth: 0,
    borderColor: Colors.divider,
  },
  prefixText: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  customInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderTopRightRadius: BorderRadius.md,
    borderBottomRightRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.divider,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
  },
});
