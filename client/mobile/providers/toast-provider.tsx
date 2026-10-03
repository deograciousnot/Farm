import Feather from '@expo/vector-icons/Feather';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ToastTone = 'success' | 'error' | 'info';
type Toast = { id: number; message: string; tone: ToastTone };

type ToastContextValue = {
  showToast: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

const toneIcons: Record<ToastTone, keyof typeof Feather.glyphMap> = {
  success: 'check-circle',
  error: 'alert-circle',
  info: 'info',
};

/** Short, non-blocking feedback ("Report sent"). Use Alert only for decisions that need a choice. */
export function ToastProvider({ children }: PropsWithChildren) {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<Toast | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, tone: ToastTone = 'success') => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setToast({ id: Date.now(), message, tone });
    timeoutRef.current = setTimeout(() => setToast(null), tone === 'error' ? 4000 : 2600);
  }, []);

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    },
    []
  );

  // The toast uses inverted colours, so take icon colours from the opposite scheme for contrast.
  const inverted = Colors[scheme === 'dark' ? 'light' : 'dark'];
  const iconColor = toast?.tone === 'error' ? inverted.danger : toast?.tone === 'info' ? inverted.textMuted : inverted.success;

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View pointerEvents="none" style={[styles.host, { top: insets.top + Spacing.xs }]}>
        {toast ? (
          <Animated.View
            key={toast.id}
            entering={FadeInUp.duration(200)}
            exiting={FadeOutUp.duration(200)}
            accessibilityLiveRegion="polite"
            style={[styles.toast, { backgroundColor: colors.text }]}>
            <Feather name={toneIcons[toast.tone]} size={18} color={iconColor} />
            <AppText variant="label" color="background" style={styles.message}>
              {toast.message}
            </AppText>
          </Animated.View>
        ) : null}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: Spacing.md, right: Spacing.md, alignItems: 'center' },
  toast: {
    maxWidth: 480,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  message: { flexShrink: 1 },
});
