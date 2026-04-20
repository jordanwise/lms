import { View, Text, StyleSheet, SafeAreaView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MenuButton } from '@/components/ui/MenuButton';
import { Colors, Spacing, FontSize } from '@/constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>LAST PLAYER</Text>
          <Text style={styles.title}>STANDING</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>PRIVATE</Text>
            <View style={styles.dividerLine} />
          </View>

          <MenuButton label="Create Private Game" href="/private/create" />
          <MenuButton label="Join Private Game" href="/private/join" />
        </View>

        <View style={styles.section}>
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>PUBLIC</Text>
            <View style={styles.dividerLine} />
          </View>

          <MenuButton label="Create Public Game" href="/public/create" />
          <MenuButton label="Join Public Game" href="/public/join" />
        </View>

        <Pressable style={styles.accountButton} onPress={() => router.push('/account')}>
          <Ionicons name="person-circle-outline" size={32} color={Colors.textMuted} />
          <Text style={styles.accountLabel}>Account</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  accountButton: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  accountLabel: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 4,
  },
  title: {
    fontSize: FontSize.title,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: 2,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.divider,
  },
  dividerText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    fontWeight: '600',
    letterSpacing: 3,
    marginHorizontal: Spacing.md,
  },
});
