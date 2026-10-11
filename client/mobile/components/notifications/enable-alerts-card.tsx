import AsyncStorage from '@react-native-async-storage/async-storage';
import Feather from '@expo/vector-icons/Feather';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Radius, Spacing } from '@/constants/theme';
import { usePushPermission } from '@/hooks/use-push-notifications';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/providers/session-provider';

const DISMISSED_KEY = 'farmconnect.push.promptDismissed';

/**
 * Explains what notifications are for before the system prompt appears, so members say yes with
 * context. Shown on Home to signed-in members who haven't decided yet; "Not now" hides it for good
 * (Settings keeps a way to turn alerts on).
 */
export function EnableAlertsCard() {
  const { colors } = useTheme();
  const { mode } = useSession();
  const { permission, enable } = usePushPermission();
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(DISMISSED_KEY)
      .then((value) => setDismissed(value === 'true'))
      .catch(() => setDismissed(false));
  }, []);

  if (mode !== 'authenticated' || dismissed !== false || (permission !== 'undetermined' && permission !== 'denied')) {
    return null;
  }

  const dismiss = () => {
    setDismissed(true);
    void AsyncStorage.setItem(DISMISSED_KEY, 'true').catch(() => {});
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.primarySoft }]}>
      <View style={styles.row}>
        <Feather name="bell" size={20} color={colors.primary} />
        <View style={styles.copy}>
          <AppText variant="label">Get alerts on your phone</AppText>
          <AppText variant="callout" color="textMuted">
            Pest alerts for your county, answers to your questions, and order updates, even when the app is closed.
          </AppText>
        </View>
      </View>
      <View style={styles.actions}>
        <Button label="Not now" variant="ghost" size="sm" onPress={dismiss} />
        <Button label="Turn on" size="sm" onPress={() => void enable()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.md, borderRadius: Radius.md, gap: Spacing.sm },
  row: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  copy: { flex: 1, gap: 2 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.xs },
});
