import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { IconButton } from '@/components/ui/icon-button';
import { ScreenPadding, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ScreenHeaderProps = {
  title: string;
  /** Use a close (x) icon instead of a back arrow, for modal-style screens. */
  closeIcon?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
};

/** Top bar for pushed (non-tab) screens. Handles the safe area itself. */
export function ScreenHeader({ title, closeIcon = false, onBack, right }: ScreenHeaderProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  function handleBack() {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }

  return (
    <View style={[styles.bar, { paddingTop: insets.top + Spacing.xs, backgroundColor: colors.background }]}>
      <IconButton icon={closeIcon ? 'x' : 'arrow-left'} label={closeIcon ? 'Close' : 'Go back'} onPress={handleBack} />
      <AppText variant="subhead" numberOfLines={1} style={styles.title}>
        {title}
      </AppText>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

type TabHeaderProps = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
};

/** Large title for the top of a tab screen. Place inside the scroll content. */
export function TabHeader({ title, subtitle, right }: TabHeaderProps) {
  return (
    <View style={styles.tabHeader}>
      <View style={styles.tabHeaderTop}>
        <AppText variant="display" accessibilityRole="header" style={styles.tabTitle}>
          {title}
        </AppText>
        {right ? <View style={styles.tabActions}>{right}</View> : null}
      </View>
      {subtitle ? (
        <AppText variant="callout" color="textMuted">
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: ScreenPadding,
    paddingBottom: Spacing.xs,
  },
  title: { flex: 1, textAlign: 'center' },
  right: { minWidth: 40, flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.xs },
  tabHeader: { gap: Spacing.xxs },
  tabHeaderTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  tabTitle: { flex: 1 },
  tabActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
});
