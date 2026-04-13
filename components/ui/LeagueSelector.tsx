import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  FlatList,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

const LEAGUES = [
  'Premier League',
  'Championship',
  'League One',
  'League Two',
  'National League',
  'Scottish Premiership',
];

type LeagueSelectorProps = {
  selected: string[];
  onChanged: (leagues: string[]) => void;
};

export function LeagueSelector({ selected, onChanged }: LeagueSelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const toggleLeague = (league: string) => {
    if (selected.includes(league)) {
      onChanged(selected.filter((l) => l !== league));
    } else {
      onChanged([...selected, league]);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>PLAYABLE LEAGUES</Text>

      <Pressable style={styles.selector} onPress={() => setModalVisible(true)}>
        <Text style={selected.length ? styles.selectorText : styles.selectorPlaceholder}>
          {selected.length ? `${selected.length} league(s) selected` : 'Select leagues...'}
        </Text>
        <Text style={styles.arrow}>▼</Text>
      </Pressable>

      {selected.length > 0 && (
        <View style={styles.chipRow}>
          {selected.map((league) => (
            <Pressable
              key={league}
              style={styles.chip}
              onPress={() => toggleLeague(league)}
            >
              <Text style={styles.chipText}>{league}</Text>
              <Text style={styles.chipRemove}>✕</Text>
            </Pressable>
          ))}
        </View>
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Leagues</Text>
            <Pressable onPress={() => setModalVisible(false)}>
              <Text style={styles.doneButton}>Done</Text>
            </Pressable>
          </View>

          <FlatList
            data={LEAGUES}
            keyExtractor={(item) => item}
            renderItem={({ item }) => {
              const isSelected = selected.includes(item);
              return (
                <Pressable
                  style={styles.modalRow}
                  onPress={() => toggleLeague(item)}
                >
                  <View style={[styles.modalCheck, isSelected && styles.modalCheckSelected]}>
                    {isSelected && <Text style={styles.modalCheckMark}>✓</Text>}
                  </View>
                  <Text style={styles.modalRowText}>{item}</Text>
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
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
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.divider,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  selectorText: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  selectorPlaceholder: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textMuted,
  },
  arrow: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '30',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
  },
  chipText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    marginRight: Spacing.xs,
  },
  chipRemove: {
    fontSize: FontSize.sm - 2,
    color: Colors.primary,
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  doneButton: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.primary,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  modalCheck: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm / 2,
    borderWidth: 2,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  modalCheckSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  modalCheckMark: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  modalRowText: {
    fontSize: FontSize.lg,
    color: Colors.text,
  },
});
