import { Pressable, View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

type CheckboxProps = {
  checked: boolean;
  label: string;
  onToggle: () => void;
};

export function Checkbox({ checked, label, onToggle }: CheckboxProps) {
  return (
    <Pressable style={styles.container} onPress={onToggle}>
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked && <Text style={styles.check}>✓</Text>}
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    flex: 1,
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm / 2,
    borderWidth: 2,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  boxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  check: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  label: {
    fontSize: FontSize.md,
    color: Colors.text,
  },
});
