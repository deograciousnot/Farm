import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSession } from '@/providers/session-provider';

const featureNotes = [
  'Follow market tea, farming tips, and produce updates in a social feed.',
  'Shop serious marketplace listings from farmers and farm-input sellers.',
  'Join focused communities that feel closer to Reddit and Quora than old-school forums.',
];

const secondaryActions = [
  { label: 'Continue with Google', note: 'UI ready, backend/provider hookup next.' },
  { label: 'Continue with phone', note: 'Ideal for OTP login once SMS provider is added.' },
];

export default function GetStartedScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { continueAsGuest, markIntroSeen } = useSession();

  function goToAuth(mode: 'signup' | 'login') {
    markIntroSeen();
    router.push(`/auth?mode=${mode}`);
  }

  function handleGuest() {
    continueAsGuest();
    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.hero, { backgroundColor: palette.backgroundSecondary }]}>
          <View style={[styles.heroGlowLarge, { backgroundColor: `${palette.accent}20` }]} />
          <View style={[styles.heroGlowSmall, { backgroundColor: `${palette.tint}18` }]} />
          <View style={[styles.brandBadge, { backgroundColor: palette.surfaceRaised }]}>
            <Feather name="sunrise" size={14} color={palette.tint} />
            <Text style={[styles.brandBadgeText, { color: palette.text }]}>FarmConnect</Text>
          </View>
          <Text style={[styles.eyebrow, { color: palette.tint }]}>Fresh local connected</Text>
          <Text style={[styles.heading, { color: palette.text }]}>
            Social energy for the next generation of agriculture.
          </Text>
          <Text style={[styles.subheading, { color: palette.muted }]}>
            FarmConnect blends discovery, learning, communities, and buying into one playful mobile experience.
          </Text>

          <View style={styles.featureStack}>
            {featureNotes.map((note, index) => (
              <View
                key={note}
                style={[
                  styles.featureCard,
                  {
                    backgroundColor: index === 1 ? `${palette.accent}12` : palette.surfaceRaised,
                  },
                ]}>
                <View
                  style={[
                    styles.featureDot,
                    { backgroundColor: index === 1 ? palette.accent : index === 2 ? palette.accentSecondary : palette.tint },
                  ]}
                />
                <Text style={[styles.featureText, { color: palette.text }]}>{note}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.primaryActions}>
          <Pressable onPress={() => goToAuth('signup')} style={[styles.primaryButton, { backgroundColor: palette.tint }]}>
            <Text style={styles.primaryButtonText}>Create account</Text>
          </Pressable>

          <Pressable onPress={() => goToAuth('login')} style={[styles.secondaryButton, { backgroundColor: palette.accent }]}>
            <Text style={styles.primaryButtonText}>I already have an account</Text>
          </Pressable>
        </View>

        <View style={[styles.altCard, { backgroundColor: palette.surfaceRaised, borderColor: palette.border }]}>
          <Text style={[styles.altTitle, { color: palette.text }]}>More ways in</Text>
          {secondaryActions.map((action) => (
            <Pressable
              key={action.label}
              onPress={() => goToAuth('login')}
              style={[styles.altAction, { backgroundColor: palette.surface }]}>
              <View style={styles.altActionRow}>
                <Feather
                  name={action.label.includes('Google') ? 'chrome' : 'smartphone'}
                  size={16}
                  color={palette.text}
                />
                <Text style={[styles.altActionLabel, { color: palette.text }]}>{action.label}</Text>
              </View>
              <Text style={[styles.altActionNote, { color: palette.muted }]}>{action.note}</Text>
            </Pressable>
          ))}
        </View>

        <View style={[styles.guestCard, { backgroundColor: palette.surfaceRaised, borderColor: palette.border }]}>
          <Text style={[styles.guestTitle, { color: palette.text }]}>Proceed as guest</Text>
          <Text style={[styles.guestCopy, { color: palette.muted }]}>
            Guests can browse the feed, marketplace, and communities, but commenting, saving, orders, and seller tools stay locked.
          </Text>
          <Pressable onPress={handleGuest} style={[styles.guestButton, { borderColor: palette.border, backgroundColor: palette.surface }]}>
            <Text style={[styles.guestButtonText, { color: palette.text }]}>Continue as guest</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 20, gap: 18, paddingBottom: 36 },
  hero: { borderRadius: 32, padding: 20, gap: 12, overflow: 'hidden' },
  brandBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  brandBadgeText: { fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '700' },
  heroGlowLarge: { position: 'absolute', width: 180, height: 180, borderRadius: 999, right: -36, top: -42 },
  heroGlowSmall: { position: 'absolute', width: 112, height: 112, borderRadius: 999, left: -20, bottom: -20 },
  eyebrow: {
    fontFamily: Fonts.rounded,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  heading: { fontFamily: Fonts.rounded, fontSize: 32, fontWeight: '700', lineHeight: 38 },
  subheading: { fontFamily: Fonts.sans, fontSize: 15, lineHeight: 22 },
  featureStack: { gap: 10, marginTop: 6 },
  featureCard: { borderRadius: 20, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  featureDot: { width: 12, height: 12, borderRadius: 999, marginTop: 5 },
  featureText: { flex: 1, fontFamily: Fonts.sans, fontSize: 14, lineHeight: 21 },
  primaryActions: { gap: 12 },
  primaryButton: { borderRadius: 999, paddingVertical: 16, alignItems: 'center' },
  secondaryButton: { borderRadius: 999, paddingVertical: 16, alignItems: 'center' },
  primaryButtonText: { color: '#ffffff', fontFamily: Fonts.rounded, fontSize: 15, fontWeight: '700' },
  altCard: { borderRadius: 28, borderWidth: 1, padding: 18, gap: 12 },
  altTitle: { fontFamily: Fonts.rounded, fontSize: 20, fontWeight: '700' },
  altAction: { borderRadius: 20, padding: 14, gap: 4 },
  altActionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  altActionLabel: { fontFamily: Fonts.rounded, fontSize: 14, fontWeight: '700' },
  altActionNote: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19 },
  guestCard: { borderRadius: 28, borderWidth: 1, padding: 18, gap: 12 },
  guestTitle: { fontFamily: Fonts.rounded, fontSize: 20, fontWeight: '700' },
  guestCopy: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 21 },
  guestButton: { borderRadius: 999, borderWidth: 1, paddingVertical: 15, alignItems: 'center' },
  guestButtonText: { fontFamily: Fonts.rounded, fontSize: 14, fontWeight: '700' },
});
