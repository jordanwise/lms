import { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, KeyboardAvoidingView,
  Platform, Alert, TextInput, Pressable, ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { getOrCreateUserId, getDisplayName } from '@/lib/userId';
import { getGameByPin, joinGame, type GameByPinResult } from '@/lib/api';

const STATE_LABEL: Record<string, string> = {
  waiting_for_players: 'Waiting for players',
  active: 'Active',
  completed: 'Completed',
  rollover_pending: 'Rollover pending',
  cancelled: 'Cancelled',
  abandoned: 'Abandoned',
};

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function JoinPrivateGame() {
  const router = useRouter();
  const params = useLocalSearchParams<{ pin?: string }>();
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [pin, setPin] = useState('');
  const [searching, setSearching] = useState(false);
  const [joining, setJoining] = useState(false);
  const [foundGame, setFoundGame] = useState<GameByPinResult | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const inputRef = useRef<TextInput>(null);
  const hasAutoFilled = useRef(false);

  useEffect(() => {
    Promise.all([getOrCreateUserId(), getDisplayName()]).then(([id, name]) => {
      setUserId(id);
      setDisplayName(name);
    });
  }, []);

  // Auto-fill PIN from deep link param
  useEffect(() => {
    if (params.pin && !hasAutoFilled.current) {
      hasAutoFilled.current = true;
      const pinValue = params.pin.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
      setPin(pinValue);
      // Auto-trigger search after a brief delay
      if (pinValue.length >= 6) {
        setTimeout(() => {
          setSearching(true);
          getGameByPin(pinValue).then(result => {
            setSearching(false);
            if (result.ok) {
              setFoundGame(result.data);
            } else {
              Alert.alert('Not Found', result.error === 'Not Found' ? 'No game found with that PIN.' : result.error);
            }
          });
        }, 300);
      }
    }
  }, [params.pin]);

  const handlePinChange = (text: string) => {
    setPin(text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8));
    if (foundGame) setFoundGame(null);
  };

  const handleFind = async () => {
    if (pin.length < 6) return;
    setSearching(true);
    const result = await getGameByPin(pin);
    setSearching(false);
    if (result.ok) {
      setFoundGame(result.data);
    } else {
      Alert.alert('Not Found', result.error === 'Not Found' ? 'No game found with that PIN.' : result.error);
    }
  };

  const handleJoin = async () => {
    if (!foundGame || !userId) return;

    if (foundGame.state !== 'waiting_for_players' && foundGame.state !== 'abandoned') {
      Alert.alert(
        'Cannot Join',
        `This game is currently "${STATE_LABEL[foundGame.state] ?? foundGame.state}" and is not accepting new players.`,
      );
      return;
    }

    setJoining(true);
    const result = await joinGame(foundGame.gameId, userId, displayName);
    setJoining(false);

    if (result.ok) {
      router.replace(`/game/${foundGame.gameId}`);
    } else {
      Alert.alert('Could Not Join', result.error);
    }
  };

  const canJoin = foundGame?.state === 'waiting_for_players' || foundGame?.state === 'abandoned';

  const handleOpenScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Permission needed', 'Camera permission is required to scan QR codes.');
        return;
      }
    }
    setShowScanner(true);
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    setShowScanner(false);

    // Try to extract PIN from lms://join/PIN URL
    let extractedPin: string | null = null;

    if (data.startsWith('lms://join/')) {
      extractedPin = data.replace('lms://join/', '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    } else if (data.startsWith('lastplayerstanding://join/')) {
      extractedPin = data.replace('lastplayerstanding://join/', '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    } else if (/^[A-Z0-9]{6,8}$/.test(data.trim())) {
      // Maybe just a PIN was encoded
      extractedPin = data.trim().toUpperCase();
    }

    if (extractedPin && extractedPin.length >= 6) {
      setPin(extractedPin);
      setFoundGame(null);
      // Auto-trigger search
      setTimeout(() => {
        setSearching(true);
        getGameByPin(extractedPin!).then(result => {
          setSearching(false);
          if (result.ok) {
            setFoundGame(result.data);
          } else {
            Alert.alert('Not Found', 'No game found with that PIN.');
          }
        });
      }, 200);
    } else {
      Alert.alert('Invalid QR Code', 'The scanned QR code does not contain a valid LMS game link.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* PIN entry */}
        <View style={styles.pinSection}>
          <Text style={styles.sectionLabel}>ENTER GAME PIN</Text>
          <View style={styles.pinRow}>
            <TextInput
              ref={inputRef}
              style={styles.pinInput}
              value={pin}
              onChangeText={handlePinChange}
              placeholder="e.g. AB12CD34"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={8}
              returnKeyType="search"
              onSubmitEditing={handleFind}
            />
            <Pressable
              style={[styles.findButton, (pin.length < 6 || searching) && styles.findButtonDisabled]}
              onPress={handleFind}
              disabled={pin.length < 6 || searching}
            >
              {searching
                ? <ActivityIndicator size="small" color={Colors.text} />
                : <Ionicons name="search" size={20} color={pin.length >= 6 ? Colors.text : Colors.textMuted} />}
            </Pressable>
          </View>
          <Text style={styles.hint}>Ask the game organiser for the PIN</Text>

          <Pressable style={styles.scanButton} onPress={handleOpenScanner}>
            <Ionicons name="qr-code-outline" size={20} color={Colors.primary} />
            <Text style={styles.scanButtonText}>Scan QR Code</Text>
          </Pressable>
        </View>

        {/* Game preview */}
        {foundGame && (
          <>
            <View style={styles.foundBanner}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              <Text style={styles.foundText}>Game found!</Text>
            </View>

            <View style={styles.card}>
              <SummaryRow label="Game Name" value={foundGame.name} />
              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Game PIN</Text>
                <Text style={styles.pinValue}>{foundGame.pin}</Text>
              </View>
              <View style={styles.divider} />
              <SummaryRow label="Status" value={STATE_LABEL[foundGame.state] ?? foundGame.state} />
              <View style={styles.divider} />
              <SummaryRow label="Entry Fee" value={`£${foundGame.fee}`} />
              <View style={styles.divider} />
              <SummaryRow label="Players" value={String(foundGame.playerCount)} />
              <View style={styles.divider} />
              <SummaryRow label="Leagues" value={foundGame.leagues.join(', ')} />
            </View>

            {!canJoin && (
              <View style={styles.warningCard}>
                <Ionicons name="warning-outline" size={18} color={Colors.warning} />
                <Text style={styles.warningText}>
                  This game is not currently accepting players.
                </Text>
              </View>
            )}

            <Text style={styles.playingAs}>
              Joining as <Text style={styles.playingAsName}>{displayName}</Text>
            </Text>

            <PrimaryButton
              label={joining ? 'Joining…' : 'Join Game'}
              onPress={handleJoin}
              disabled={!canJoin || joining || !userId}
            />
          </>
        )}
      </ScrollView>

      {/* QR Scanner Modal */}
      <Modal
        visible={showScanner}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowScanner(false)}
      >
        <View style={styles.scannerContainer}>
          <CameraView
            style={styles.camera}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleBarcodeScanned}
          />
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerFrame} />
          </View>
          <Pressable style={styles.scannerClose} onPress={() => setShowScanner(false)}>
            <Ionicons name="close-circle" size={48} color={Colors.text} />
          </Pressable>
          <Text style={styles.scannerHint}>Point camera at a QR code</Text>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  pinSection: {
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  pinRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  pinInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.divider,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 4,
    fontFamily: 'SpaceMono',
  },
  findButton: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.divider,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 52,
  },
  findButtonDisabled: {
    opacity: 0.5,
  },
  hint: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
  foundBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  foundText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.success,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  rowLabel: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  rowValue: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: Spacing.md,
  },
  pinValue: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 3,
    fontFamily: 'SpaceMono',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
  },
  warningText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  playingAs: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  playingAsName: {
    fontWeight: '700',
    color: Colors.text,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.divider,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  scanButtonText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.primary,
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    backgroundColor: 'transparent',
  },
  scannerClose: {
    position: 'absolute',
    top: 60,
    left: Spacing.lg,
  },
  scannerHint: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
});
