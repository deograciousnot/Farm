import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { api } from '@/lib/api';

// The token this phone last registered, so sign-out can remove exactly that one.
const REGISTERED_TOKEN_KEY = 'farmconnect.push.token';
const pushSupported = Platform.OS !== 'web';

export type PushPermission = 'granted' | 'undetermined' | 'denied' | 'blocked' | 'unsupported';

/** Show notifications that arrive while the app is open, and create the Android channels. Call once at startup. */
export function configureNotifications() {
  if (!pushSupported) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });

  if (Platform.OS === 'android') {
    // Separate channels let members silence activity without missing pest alerts, from Android settings.
    void Notifications.setNotificationChannelAsync('alerts', {
      name: 'Official alerts',
      description: 'Pest alerts, advisories and programmes from verified organisations',
      importance: Notifications.AndroidImportance.HIGH,
    });
    void Notifications.setNotificationChannelAsync('default', {
      name: 'Activity',
      description: 'Replies, comments and orders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

/** "blocked" means the member said no and the system won't ask again: only Settings can turn it on. */
export async function getPushPermission(): Promise<PushPermission> {
  if (!pushSupported) return 'unsupported';
  const { status, canAskAgain } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return 'granted';
  if (status === 'undetermined') return 'undetermined';
  return canAskAgain ? 'denied' : 'blocked';
}

async function registerToken(authToken: string) {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  const { data: pushToken } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  await api.registerPushToken(authToken, pushToken, Platform.OS);
  await AsyncStorage.setItem(REGISTERED_TOKEN_KEY, pushToken);
}

/** Asks for permission (the system prompt) and registers this phone. Returns the resulting permission. */
export async function enablePush(authToken: string): Promise<PushPermission> {
  if (!pushSupported) return 'unsupported';
  const { status } = await Notifications.requestPermissionsAsync();
  if (status === 'granted') {
    await registerToken(authToken).catch((error) => console.warn('Push registration failed', error));
  }
  return getPushPermission();
}

/** On launch and sign-in: refresh this phone's token if the member already allowed notifications. Never prompts. */
export async function registerIfAllowed(authToken: string) {
  if ((await getPushPermission()) !== 'granted') return;
  await registerToken(authToken).catch((error) => console.warn('Push registration failed', error));
}

/** On sign-out, so a shared phone stops receiving the previous member's notifications. */
export async function unregisterPush(authToken: string) {
  const pushToken = await AsyncStorage.getItem(REGISTERED_TOKEN_KEY);
  if (!pushToken) return;
  await AsyncStorage.removeItem(REGISTERED_TOKEN_KEY);
  await api.removePushToken(authToken, pushToken).catch(() => {});
}
