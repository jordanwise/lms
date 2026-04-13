import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
};

export function PrimaryButton({ label, onPress, disabled = false, loading = false }: PrimaryButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        pressed && !disabled && styles.buttonPressed,
        disabled && styles.buttonDisabled,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={Colors.text} />
      ) : (
        <Text style={[styles.label, disabled && styles.labelDisabled]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    backgroundColor: Colors.primaryDark,
  },
  buttonDisabled: {
    backgroundColor: Colors.surfaceLight,
  },
  label: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  labelDisabled: {
    color: Colors.textMuted,
  },
});
