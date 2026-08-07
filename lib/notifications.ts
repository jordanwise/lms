import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { registerPushToken as registerPushTokenApi } from './api';

/**
 * Request permission and register for push notifications.
 * Returns the Expo push token string, or null if permissions denied.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  const settings = await Notifications.getPermissionsAsync() as Notifications.NotificationPermissionsStatus & { granted: boolean };
  if (!settings.granted) {
    const newSettings = await Notifications.requestPermissionsAsync() as Notifications.NotificationPermissionsStatus & { granted: boolean };
    if (!newSettings.granted) {
      console.log('Push notification permission not granted');
      return null;
    }
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF4D4D',
    });
  }

  return token;
}

/**
 * Register push token with the backend. Call after getting a new token.
 */
export async function registerPushTokenWithBackend(userId: string): Promise<boolean> {
  try {
    const token = await registerForPushNotifications();
    if (!token) return false;

    const result = await registerPushTokenApi(userId, token, Platform.OS as 'ios' | 'android');
    return result.ok;
  } catch (err) {
    console.error('Failed to register push token:', err);
    return false;
  }
}

/**
 * Schedule a local notification with a short delay (for testing on simulator).
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
  secondsFromNow = 1,
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data ?? {},
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: secondsFromNow,
    },
  });
}

/**
 * Check if push notification permissions are currently granted.
 */
export async function hasPushPermission(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync() as Notifications.NotificationPermissionsStatus & { granted: boolean };
  return settings.granted;
}

/**
 * Open device notification settings.
 */
export async function openNotificationSettings(): Promise<void> {
  // On iOS, there is no direct API to open notification settings.
  // We can only re-prompt for permissions.
  // The user must go to Settings > Notifications manually or
  // we re-request permissions.
  await Notifications.requestPermissionsAsync();
}
