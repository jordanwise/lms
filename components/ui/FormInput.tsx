import { View, Text, TextInput, StyleSheet, KeyboardTypeOptions } from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

type FormInputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  maxLength?: number;
  prefix?: string;
  keyboardType?: KeyboardTypeOptions;
};

export function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  maxLength,
  prefix,
  keyboardType = 'default',
}: FormInputProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        {prefix && (
          <View style={styles.prefixBox}>
            <Text style={styles.prefixText}>{prefix}</Text>
          </View>
        )}
        <TextInput
          style={[styles.input, prefix && styles.inputWithPrefix]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          maxLength={maxLength}
          keyboardType={keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      {maxLength && (
        <Text style={styles.charCount}>
          {value.length}/{maxLength}
        </Text>
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
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputRow: {
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
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.divider,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  inputWithPrefix: {
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  charCount: {
    fontSize: FontSize.sm - 2,
    color: Colors.textMuted,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
});
