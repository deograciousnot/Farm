import { DarkTheme, DefaultTheme, ThemeProvider, type Theme } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import 'react-native-reanimated';

import { appFonts } from '@/constants/fonts';
import { useTheme } from '@/hooks/use-theme';
import { queryClient } from '@/lib/query-client';
import { PreferencesProvider } from '@/providers/preferences-provider';
import { SessionProvider, useSession } from '@/providers/session-provider';
import { ToastProvider } from '@/providers/toast-provider';

export const unstable_settings = {
  anchor: '(tabs)',
};

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
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
          <Stack.Screen name="community/[id]" />
          <Stack.Screen name="community/new" options={{ presentation: 'modal' }} />
          <Stack.Screen name="order/[id]" />
          <Stack.Screen name="post/[id]" />
          <Stack.Screen name="profile/[id]" />
          <Stack.Screen name="profile/edit" options={{ presentation: 'modal' }} />
          <Stack.Screen name="settings" />
          <Stack.Screen name="product/[id]" />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      </ToastProvider>
    </ThemeProvider>
  );
}
