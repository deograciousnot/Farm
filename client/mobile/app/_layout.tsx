import { DarkTheme, DefaultTheme, ThemeProvider, type Theme } from 'expo-router/react-navigation';
import * as Sentry from '@sentry/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import 'react-native-reanimated';

import { AnimatedSplash } from '@/components/brand/animated-splash';
import { appFonts } from '@/constants/fonts';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { useTheme } from '@/hooks/use-theme';
import { configureNotifications } from '@/lib/push';
import { queryClient } from '@/lib/query-client';
import { PreferencesProvider } from '@/providers/preferences-provider';
import { SessionProvider, useSession } from '@/providers/session-provider';
import { ToastProvider } from '@/providers/toast-provider';

export const unstable_settings = {
  anchor: '(tabs)',
};

void SplashScreen.preventAutoHideAsync();
// Crossfade from the native splash into the animated one (same picture), hiding any tiny offset.
SplashScreen.setOptions({ duration: 300, fade: true });
configureNotifications();

// Crash reporting is off until a Sentry DSN is set in app.json (extra.sentryDsn). No personal data is sent.
const sentryDsn = (Constants.expoConfig?.extra?.sentryDsn as string | undefined) || process.env.EXPO_PUBLIC_SENTRY_DSN;

if (sentryDsn && !__DEV__) {
  Sentry.init({ dsn: sentryDsn, sendDefaultPii: false, tracesSampleRate: 0 });
}

export default Sentry.wrap(RootLayout);

function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(appFonts);

  // Fall back to system fonts rather than hanging on the splash if fonts fail to load.
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider>
        <SessionProvider>
          <AppShell />
        </SessionProvider>
      </PreferencesProvider>
    </QueryClientProvider>
  );
}

function AppShell() {
  const { scheme, colors } = useTheme();
  const { isLoading } = useSession();
  const [showSplash, setShowSplash] = useState(true);
  // Stable, so re-renders while the session loads don't restart the animation.
  const hideSplash = useCallback(() => setShowSplash(false), []);
  usePushNotifications();

  useEffect(() => {
    if (!isLoading) {
      void SplashScreen.hideAsync();
    }
  }, [isLoading]);

  const navigationTheme = useMemo<Theme>(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;

    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
      },
    };
  }, [colors, scheme]);

  return (
    <ThemeProvider value={navigationTheme}>
      <ToastProvider>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="get-started" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="broadcast/[id]" />
          <Stack.Screen name="broadcasts" />
          <Stack.Screen name="organization/[id]" />
          <Stack.Screen name="community/[id]" />
          <Stack.Screen name="community/new" options={{ presentation: 'modal' }} />
          <Stack.Screen name="order/[id]" />
          <Stack.Screen name="post/[id]" />
          <Stack.Screen name="profile/[id]" />
          <Stack.Screen name="profile/edit" options={{ presentation: 'modal' }} />
          <Stack.Screen name="settings" />
          <Stack.Screen name="verify-email" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="legal/[doc]" />
          <Stack.Screen name="product/[id]" />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
        {showSplash ? <AnimatedSplash ready={!isLoading} onDone={hideSplash} /> : null}
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      </ToastProvider>
    </ThemeProvider>
  );
}
