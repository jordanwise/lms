import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FormInput } from '@/components/ui/FormInput';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { getOrCreateUserId, getDisplayName, saveDisplayName } from '@/lib/userId';
import { getUser, updatePreferences } from '@/lib/api';
import { hasPushPermission, registerForPushNotifications, registerPushTokenWithBackend } from '@/lib/notifications';

interface NotificationPrefs {
  notificationsEnabled: boolean;
  notifyOnRoundOpen: boolean;
  notifyOnDeadlineReminder: boolean;
  notifyOnResults: boolean;
  notifyOnElimination: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  notificationsEnabled: true,
  notifyOnRoundOpen: true,
  notifyOnDeadlineReminder: true,
  notifyOnResults: true,
  notifyOnElimination: true,
};

function PrefRow({
  icon,
  label,
  value,
  onToggle,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: boolean;
  onToggle: (val: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.prefRow}>
      <Ionicons name={icon} size={20} color={Colors.textSecondary} style={styles.prefIcon} />
      <Text style={styles.prefLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: Colors.divider, true: Colors.primary + '66' }}
        thumbColor={value ? Colors.primary : Colors.textMuted}
        ios_backgroundColor={Colors.divider}
      />
    </View>
  );
}

export default function AccountSettingsScreen() {
  const [name, setName] = useState('');
  const [saved, setSaved] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [prefsError, setPrefsError] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [pushGranted, setPushGranted] = useState<boolean | null>(null);

  useEffect(() => {
    hasPushPermission().then(setPushGranted);
  }, []);

  useFocusEffect(
    useCallback(() => {
      getOrCreateUserId().then((uid) => {
        setUserId(uid);
        return uid;
      }).then((uid) => {
        // Load user preferences from backend
        getUser(uid).then((result) => {
          if (result.ok && result.data.preferences) {
            setPrefs({
              notificationsEnabled: result.data.preferences.notificationsEnabled ?? true,
              notifyOnRoundOpen: result.data.preferences.notifyOnRoundOpen ?? true,
              notifyOnDeadlineReminder: result.data.preferences.notifyOnDeadlineReminder ?? true,
              notifyOnResults: result.data.preferences.notifyOnResults ?? true,
              notifyOnElimination: result.data.preferences.notifyOnElimination ?? true,
            });
          } else {
            // User profile may not exist yet — use defaults
            setPrefsError(true);
          }
          setPrefsLoaded(true);
        }).catch(() => {
          setPrefsError(true);
          setPrefsLoaded(true);
        });
      });

      getDisplayName().then(setName);
      setSaved(false);
    }, []),
  );

  const handleSaveName = async () => {
    await saveDisplayName(name);
    setSaved(true);
    Alert.alert('Saved', 'Your display name has been updated.');
  };

  const updatePref = async (key: keyof NotificationPrefs, value: boolean) => {
    if (!userId) return;
    setPrefs((prev) => ({ ...prev, [key]: value }));
    setSavingPrefs(true);
    try {
      const result = await updatePreferences(userId, { [key]: value });
      if (!result.ok) {
        // Revert on failure
        setPrefs((prev) => ({ ...prev, [key]: !value }));
      }
    } catch {
      setPrefs((prev) => ({ ...prev, [key]: !value }));
    } finally {
      setSavingPrefs(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Display Name */}
      <Text style={styles.sectionTitle}>Display Name</Text>
      <Text style={styles.hint}>
        This name is shown to other players in games you create or join.
      </Text>
      <FormInput
        label=""
        value={name}
        onChangeText={(text) => {
          setName(text);
          setSaved(false);
        }}
        placeholder="lms_admin"
        maxLength={32}
      />
      <PrimaryButton
        label={saved ? 'Saved ✓' : 'Save'}
        onPress={handleSaveName}
        disabled={!name.trim() || saved}
      />

      {/* Notifications */}
      <Text style={styles.sectionTitle}>Notifications</Text>
      <Text style={styles.hint}>
        Control which game events trigger notifications.
      </Text>

      {!prefsLoaded ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={Colors.primary} size="small" />
          <Text style={styles.loadingText}>Loading preferences...</Text>
        </View>
      ) : prefsError ? (
        <View style={styles.loadingRow}>
          <Ionicons name="cloud-offline-outline" size={18} color={Colors.textMuted} />
          <Text style={styles.loadingText}>
            Couldn't load preferences. Using defaults.
          </Text>
        </View>
      ) : null}

      <View style={styles.prefsCard}>
        <PrefRow
          icon="notifications-outline"
          label="Enable Notifications"
          value={prefs.notificationsEnabled}
          onToggle={(v) => updatePref('notificationsEnabled', v)}
        />
        <View style={styles.divider} />
        <PrefRow
          icon="open-outline"
          label="Round Opens"
          value={prefs.notifyOnRoundOpen}
          onToggle={(v) => updatePref('notifyOnRoundOpen', v)}
          disabled={!prefs.notificationsEnabled}
        />
        <View style={styles.divider} />
        <PrefRow
          icon="alarm-outline"
          label="Deadline Reminders"
          value={prefs.notifyOnDeadlineReminder}
          onToggle={(v) => updatePref('notifyOnDeadlineReminder', v)}
          disabled={!prefs.notificationsEnabled}
        />
        <View style={styles.divider} />
        <PrefRow
          icon="checkmark-circle-outline"
          label="Results"
          value={prefs.notifyOnResults}
          onToggle={(v) => updatePref('notifyOnResults', v)}
          disabled={!prefs.notificationsEnabled}
        />
        <View style={styles.divider} />
        <PrefRow
          icon="close-circle-outline"
          label="Elimination"
          value={prefs.notifyOnElimination}
          onToggle={(v) => updatePref('notifyOnElimination', v)}
          disabled={!prefs.notificationsEnabled}
        />
      </View>

      {savingPrefs && (
        <View style={styles.savingRow}>
          <ActivityIndicator color={Colors.primary} size="small" />
          <Text style={styles.savingText}>Saving...</Text>
        </View>
      )}

      {/* Push Notification Status */}
      <Text style={styles.sectionTitle}>Push Notifications</Text>
      <Text style={styles.hint}>
        Push notifications deliver game updates even when the app is closed.
      </Text>

      {pushGranted === null ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={Colors.primary} size="small" />
          <Text style={styles.loadingText}>Checking push status...</Text>
        </View>
      ) : pushGranted ? (
        <View style={styles.pushStatusRow}>
          <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
          <Text style={styles.pushStatusText}>Push notifications enabled</Text>
        </View>
      ) : (
        <View style={styles.pushStatusContainer}>
          <View style={styles.pushStatusRow}>
            <Ionicons name="close-circle" size={20} color={Colors.error} />
            <Text style={styles.pushStatusText}>Push notifications disabled</Text>
          </View>
          <TouchableOpacity
            style={styles.enablePushButton}
            onPress={async () => {
              const token = await registerForPushNotifications();
              if (token && userId) {
                await registerPushTokenWithBackend(userId);
              }
              const granted = await hasPushPermission();
              setPushGranted(granted);
            }}
          >
            <Ionicons name="notifications-outline" size={16} color={Colors.primary} />
            <Text style={styles.enablePushText}>Enable Push Notifications</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: Spacing.xxl }} />
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
    paddingTop: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.xs,
    marginTop: Spacing.xl,
  },
  hint: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.lg,
  },
  prefsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  prefIcon: {
    marginRight: Spacing.md,
  },
  prefLabel: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: Spacing.md + 20 + Spacing.md,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  savingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  savingText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  pushStatusContainer: {
    gap: Spacing.sm,
  },
  pushStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  pushStatusText: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: '500',
  },
  enablePushButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  enablePushText: {
    fontSize: FontSize.md,
    color: Colors.primary,
    fontWeight: '600',
  },
});

