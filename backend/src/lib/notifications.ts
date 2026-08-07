/**
 * Send a push notification via the Expo Push API.
 *
 * The Expo Push API endpoint is: https://exp.host/--/api/v2/push/send
 * Push tokens are Expo-specific and must be routed through Expo's push service.
 *
 * In production, you'd add an Access Token header for higher throughput.
 * For local/testing purposes, no token is needed for small volumes.
 */
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export async function sendExpoPush(
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  const message = {
    to: pushToken,
    sound: 'default' as const,
    title,
    body,
    data: data ?? {},
  };

  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Expo push failed (${response.status}): ${errorText}`);
  }
}
