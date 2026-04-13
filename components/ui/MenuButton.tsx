import { Pressable, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

type MenuButtonProps = {
  label: string;
  href: string;
};

export function MenuButton({ label, href }: MenuButtonProps) {
  const router = useRouter();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
      ]}
      onPress={() => router.push(href as any)}
    >
      <Text style={styles.plus}>+</Text>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  buttonPressed: {
    backgroundColor: Colors.surfaceLight,
    borderColor: Colors.primary,
  },
  plus: {
    fontSize: FontSize.xl,
    color: Colors.primary,
    fontWeight: '700',
    marginRight: Spacing.md,
  },
  label: {
    fontSize: FontSize.lg,
    color: Colors.text,
    fontWeight: '600',
  },
});
