import { Platform } from 'react-native';

/**
 * Resolve the local API base URL for each platform.
 *
 * - iOS Simulator / Web: localhost works directly.
 * - Android Emulator:    10.0.2.2 is the host-loopback alias.
 * - Physical devices:    set LMS_API_HOST env var or edit the fallback.
 */
function getLocalApiUrl(): string {
  const port = 3000;

  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${port}`;
  }

  // iOS simulator + web
  return `http://localhost:${port}`;
}

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? getLocalApiUrl();
