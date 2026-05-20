import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

export { ErrorBoundary } from 'expo-router';

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
    </Stack>
  );
}
