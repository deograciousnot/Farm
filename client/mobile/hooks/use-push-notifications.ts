import * as Notifications from 'expo-notifications';
import { type Href, router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';

import { enablePush, getPushPermission, registerIfAllowed, type PushPermission } from '@/lib/push';
import { useSession } from '@/providers/session-provider';

/** Keeps this phone's push token current and opens the screen a tapped notification points to. Mount once. */
export function usePushNotifications() {
  const { token, mode, isLoading } = useSession();
  const handled = useRef<string | null>(null);
  const response = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (mode === 'authenticated' && token) void registerIfAllowed(token);
  }, [mode, token]);

  useEffect(() => {
    if (isLoading || !response || Platform.OS === 'web') return;
    const id = response.notification.request.identifier;
    const link = response.notification.request.content.data?.link;
    if (handled.current === id || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    handled.current = id;
    if (typeof link === 'string' && link.startsWith('/')) router.push(link as Href);
  }, [isLoading, response]);
}

/** The member's notification permission, plus one action that does the right thing for each state. */
export function usePushPermission() {
  const { token } = useSession();
  const [permission, setPermission] = useState<PushPermission | null>(null);

  const refresh = useCallback(() => {
    void getPushPermission().then(setPermission);
  }, []);

  useEffect(() => {
    refresh();
    // Re-check when they come back from the system Settings app.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const enable = useCallback(async () => {
    if (!token) return;
    if (permission === 'blocked') {
      await Linking.openSettings();
      return;
    }
    setPermission(await enablePush(token));
  }, [permission, token]);

  return { permission, enable };
}
