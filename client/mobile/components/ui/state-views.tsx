import Feather from '@expo/vector-icons/Feather';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getErrorMessage } from '@/lib/api';

type EmptyStateProps = {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  body?: string;
  action?: { label: string; onPress: () => void };
};

export function EmptyState({ icon = 'inbox', title, body, action }: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <View style={[styles.iconWrap, { backgroundColor: colors.surfaceMuted }]}>
        <Feather name={icon} size={22} color={colors.textMuted} />
      </View>
      <AppText variant="subhead" align="center">
        {title}
      </AppText>
      {body ? (
        <AppText variant="callout" color="textMuted" align="center" style={styles.body}>
          {body}
        </AppText>
      ) : null}
      {action ? <Button label={action.label} onPress={action.onPress} size="sm" variant="secondary" style={styles.action} /> : null}
    </View>
  );
}

type ErrorStateProps = {
  error: unknown;
  onRetry?: () => void;
  retrying?: boolean;
};

export function ErrorState({ error, onRetry, retrying }: ErrorStateProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <View style={[styles.iconWrap, { backgroundColor: colors.dangerSoft }]}>
        <Feather name="wifi-off" size={22} color={colors.danger} />
      </View>
      <AppText variant="subhead" align="center">
        Couldn&apos;t load this
      </AppText>
      <AppText variant="callout" color="textMuted" align="center" style={styles.body}>
        {getErrorMessage(error)}
      </AppText>
      {onRetry ? (
        <Button label="Try again" icon="refresh-cw" onPress={onRetry} loading={retrying} size="sm" variant="secondary" style={styles.action} />
      ) : null}
    </View>
  );
}

export function LoadingState() {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.xxl, paddingHorizontal: Spacing.md },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxs,
  },
  body: { maxWidth: 300 },
  action: { marginTop: Spacing.xs },
});
