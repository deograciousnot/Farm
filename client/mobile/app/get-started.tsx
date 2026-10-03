import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Radius, ScreenPadding, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/providers/session-provider';

const promises = [
  {
    icon: 'users',
    title: 'Learn from farmers across the country',
    body: 'Ask growers in other regions what worked for them, and share what works for you.',
  },
  {
    icon: 'trending-up',
    title: 'Find better markets',
    body: 'See what is selling, where, and for how much — then trade directly.',
  },
  {
    icon: 'shield',
    title: 'Build a name people trust',
    body: 'Helpful answers, honest listings, and completed orders grow your trust score.',
  },
] as const;

export default function GetStartedScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { markIntroSeen, continueAsGuest } = useSession();

  function goToAuth(mode: 'signup' | 'login') {
    markIntroSeen();
    router.replace(`/auth?mode=${mode}`);
  }

  function browseAsGuest() {
    continueAsGuest();
    router.replace('/(tabs)');
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.xxl, paddingBottom: insets.bottom + Spacing.lg }]}>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.brand}>
        <View style={[styles.logo, { backgroundColor: colors.primary }]}>
          <Feather name="sunrise" size={28} color={colors.onPrimary} />
        </View>
        <AppText variant="overline" color="primary">
          FarmConnect
        </AppText>
        <AppText variant="display">Farmers learning from farmers.</AppText>
      </Animated.View>

      <View style={styles.promises}>
        {promises.map((promise, index) => (
          <Animated.View key={promise.title} entering={FadeInDown.delay(120 + index * 90).duration(400)} style={styles.promise}>
            <View style={[styles.promiseIcon, { backgroundColor: colors.primarySoft }]}>
              <Feather name={promise.icon} size={20} color={colors.primary} />
            </View>
            <View style={styles.promiseCopy}>
              <AppText variant="subhead">{promise.title}</AppText>
              <AppText variant="callout" color="textMuted">
                {promise.body}
              </AppText>
            </View>
          </Animated.View>
        ))}
      </View>

      <View style={styles.actions}>
        <Button label="Create an account" onPress={() => goToAuth('signup')} fullWidth />
        <Button label="I already have an account" variant="secondary" onPress={() => goToAuth('login')} fullWidth />
        <Button label="Look around first" variant="ghost" onPress={browseAsGuest} fullWidth />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: ScreenPadding + Spacing.xs, gap: Spacing.xxl, justifyContent: 'space-between' },
  brand: { gap: Spacing.sm },
  logo: { width: 56, height: 56, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs },
  promises: { gap: Spacing.lg },
  promise: { flexDirection: 'row', gap: Spacing.md },
  promiseIcon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  promiseCopy: { flex: 1, gap: 2 },
  actions: { gap: Spacing.xs },
});
