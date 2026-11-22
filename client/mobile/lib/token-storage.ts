import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Keeps the sign-in token in the phone's encrypted keystore (Android Keystore / iOS Keychain) instead of
 * plain app storage. The web preview has no keystore, so it falls back to AsyncStorage there.
 *
 * Builds before 1.2.0 kept the token in AsyncStorage under the same key; readToken moves it across once.
 */
const KEY = 'farmconnect.session.token';
const useSecureStore = Platform.OS !== 'web';

export async function readToken(): Promise<string | null> {
  if (!useSecureStore) {
    return AsyncStorage.getItem(KEY);
  }

  const stored = await SecureStore.getItemAsync(KEY);
  if (stored) {
    return stored;
  }

  const legacy = await AsyncStorage.getItem(KEY);
  if (legacy) {
    await SecureStore.setItemAsync(KEY, legacy);
    await AsyncStorage.removeItem(KEY);
  }

  return legacy;
}

export async function saveToken(token: string) {
  if (!useSecureStore) {
    await AsyncStorage.setItem(KEY, token);
    return;
  }

  await SecureStore.setItemAsync(KEY, token);
}

export async function clearToken() {
  await AsyncStorage.removeItem(KEY);

  if (useSecureStore) {
    await SecureStore.deleteItemAsync(KEY);
  }
}
