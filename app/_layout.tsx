import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { useEffect, useCallback } from 'react';
import { Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { getOrCreateUserId } from '@/lib/userId';
import { registerPushTokenWithBackend } from '@/lib/notifications';

export { ErrorBoundary } from 'expo-router';

// Configure notification handler for foreground notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldSetBadge: false,
  }),
});

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function HomeBackButton({ dismissAll = false }: { dismissAll?: boolean }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => (dismissAll ? router.dismissAll() : router.back())}
      style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }}
    >
      <Ionicons name="chevron-back" size={30} color={Colors.text} />
      <Ionicons name="home-outline" size={24} color={Colors.text} style={{ marginLeft: 4 }} />
    </Pressable>
  );
}

function RulesHeaderButton() {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push('/rules')}>
      <Text style={{ color: Colors.primary, fontSize: 16, fontWeight: '600' }}>Rules</Text>
    </Pressable>
  );
}

function RootLayoutNav() {
  const router = useRouter();

  const handleDeepLink = useCallback((event: Linking.EventType) => {
    const { url } = event;
    if (!url) return;

    // Parse lms://join/PIN or lastplayerstanding://join/PIN
    const parsed = Linking.parse(url);
    const { path, queryParams } = parsed;

    if (path === 'join' && queryParams) {
      // URL format: lms://join?pin=XXXX or path-based
      const pin = typeof queryParams === 'object' && 'pin' in queryParams
        ? (queryParams as Record<string, string>).pin
        : null;
      if (pin) {
        router.push(`/private/join?pin=${pin}`);
        return;
      }
    }

    // Also handle path-based: lms://join/PIN
    if (path && path.startsWith('join/')) {
      const pin = path.replace('join/', '');
      if (pin) {
        router.push(`/private/join?pin=${pin}`);
      }
    }
  }, [router]);

  useEffect(() => {
    // Handle initial URL that launched the app
    Linking.getInitialURL().then(url => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    // Listen for incoming links while app is running
    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => subscription.remove();
  }, [handleDeepLink]);

  // Register push token with backend on startup
  useEffect(() => {
    getOrCreateUserId().then(userId => {
      registerPushTokenWithBackend(userId);
    });
  }, []);

  // Listen for notification taps and navigate to the relevant game
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const gameId = response.notification.request.content.data?.gameId;
      if (gameId && typeof gameId === 'string') {
        router.push(`/game/${gameId}`);
      }
    });
    return () => subscription.remove();
  }, [router]);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.text,
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: Colors.background },
        headerBackVisible: false,
        headerLeft: () => <HomeBackButton />,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false, headerLeft: () => null }} />
      <Stack.Screen
        name="private/create"
        options={{
          title: 'Create Private Game',
          headerRight: () => <RulesHeaderButton />,
        }}
      />
      <Stack.Screen name="private/join" options={{ title: 'Join Private Game' }} />
      <Stack.Screen name="public/create" options={{ title: 'Create Public Game' }} />
      <Stack.Screen name="public/join" options={{ title: 'Join Public Game' }} />
      <Stack.Screen name="private/confirm" options={{ title: 'Game Created', headerLeft: () => <HomeBackButton dismissAll /> }} />
      <Stack.Screen name="rules" options={{ title: 'Game Rules' }} />
      <Stack.Screen name="account/index" options={{ title: 'Account' }} />
      <Stack.Screen name="account/history" options={{ title: 'Game History' }} />
      <Stack.Screen name="account/statistics" options={{ title: 'Player Statistics' }} />
      <Stack.Screen name="account/settings" options={{ title: 'Account Settings' }} />
      <Stack.Screen name="game/[gameId]" options={{ title: 'Game Details' }} />
      <Stack.Screen name="game/[gameId]/rounds" options={{ title: 'Manage Rounds' }} />
      <Stack.Screen name="game/[gameId]/pick" options={{ title: 'Submit Pick' }} />
      <Stack.Screen name="game/[gameId]/results" options={{ title: 'Round Results' }} />
    </Stack>
  );
}
