import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSize } from '@/constants/theme';

export default function GameRules() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Game Rules</Text>

      <View style={styles.ruleBlock}>
        <Text style={styles.ruleTitle}>1. How It Works</Text>
        <Text style={styles.ruleText}>
          Each gameweek, pick one team you think will win. If your team wins, you
          survive to the next round. If they lose or draw, you're eliminated.
        </Text>
      </View>

      <View style={styles.ruleBlock}>
        <Text style={styles.ruleTitle}>2. One Pick Per Week</Text>
        <Text style={styles.ruleText}>
          You can only select one team per gameweek. Choose wisely.
        </Text>
      </View>

      <View style={styles.ruleBlock}>
        <Text style={styles.ruleTitle}>3. No Repeats</Text>
        <Text style={styles.ruleText}>
          Once you've picked a team, you cannot pick them again for the rest of the
          competition.
        </Text>
      </View>

      <View style={styles.ruleBlock}>
        <Text style={styles.ruleTitle}>4. Deadline</Text>
        <Text style={styles.ruleText}>
          Picks must be submitted before the first match of each gameweek kicks off.
          If you miss the deadline, you'll be auto-eliminated.
        </Text>
      </View>

      <View style={styles.ruleBlock}>
        <Text style={styles.ruleTitle}>5. Rollover</Text>
        <Text style={styles.ruleText}>
          If enabled, when all remaining players are eliminated in the same round,
          the pot rolls over and those players continue to the next round.
        </Text>
      </View>

      <View style={styles.ruleBlock}>
        <Text style={styles.ruleTitle}>6. Split Pot</Text>
        <Text style={styles.ruleText}>
          If enabled and multiple players survive to the final round, the pot is
          split equally among them.
        </Text>
      </View>

      <View style={styles.ruleBlock}>
        <Text style={styles.ruleTitle}>7. Winner</Text>
        <Text style={styles.ruleText}>
          The last player standing wins the pot. Good luck!
        </Text>
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
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.xl,
  },
  ruleBlock: {
    marginBottom: Spacing.lg,
  },
  ruleTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  ruleText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
});
