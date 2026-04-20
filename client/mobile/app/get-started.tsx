import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSession } from '@/providers/session-provider';

const featureNotes = [
  'A social feed for farm signals, short videos, market tea, and useful posts.',
  'A marketplace where trust, seller identity, and speed matter.',
  'Focused communities for questions, answers, and practical agriculture discussion.',
];

const secondaryActions = [
  { label: 'Continue with Google', note: 'Best next auth path once provider setup is wired.' },
  { label: 'Continue with phone', note: 'Great for OTP-based sign-in and quick account switching.' },
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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroMediaWrap}>
          <View style={[styles.heroImage, { backgroundColor: palette.backgroundSecondary }]}>
            <View style={[styles.heroGlowLarge, { backgroundColor: `${palette.accent}20` }]} />
            <View style={[styles.heroGlowSmall, { backgroundColor: `${palette.tint}16` }]} />
            <View style={[styles.photoCircle, { backgroundColor: palette.surfaceRaised }]}>
              <View style={[styles.photoInner, { backgroundColor: palette.backgroundTertiary }]} />
              <View style={[styles.photoBody, { backgroundColor: palette.tint }]} />
              <View style={[styles.photoBasket, { backgroundColor: palette.accentSecondary }]} />
            </View>
          </View>
        </View>

        <View style={styles.heroCopy}>
          <View style={[styles.brandBadge, { backgroundColor: palette.surface }]}>
            <Feather name="sunrise" size={14} color={palette.tint} />
            <Text style={[styles.brandBadgeText, { color: palette.text }]}>FarmConnect</Text>
          </View>
          <Text style={[styles.eyebrow, { color: palette.tint }]}>Fresh local connected</Text>
          <Text style={[styles.heading, { color: palette.text }]}>
            Agriculture with social energy, marketplace trust, and real community.
          </Text>
          <Text style={[styles.subheading, { color: palette.muted }]}>
            FarmConnect blends discovery, buying, discussion, and identity into one more modern mobile experience.
          </Text>
        </View>

        <View style={styles.featureList}>
          {featureNotes.map((note, index) => (
            <View key={note} style={styles.featureRow}>
              <View
                style={[
                  styles.featureDot,
                  {
                    backgroundColor:
                      index === 0 ? palette.tint : index === 1 ? palette.accent : palette.accentSecondary,
                  },
                ]}
              />
              <Text style={[styles.featureText, { color: palette.text }]}>{note}</Text>
            </View>
          ))}
        </View>

        <View style={styles.primaryActions}>
          <Pressable onPress={() => goToAuth('signup')} style={[styles.primaryButton, { backgroundColor: palette.tint }]}>
            <Text style={styles.primaryButtonText}>Create account</Text>
          </Pressable>
          <Pressable onPress={() => goToAuth('login')} style={[styles.secondaryButton, { backgroundColor: palette.surface }]}>
            <Text style={[styles.secondaryButtonText, { color: palette.text }]}>I already have an account</Text>
          </Pressable>
        </View>

        <View style={styles.moreWays}>
          {secondaryActions.map((action) => (
            <Pressable key={action.label} onPress={() => goToAuth('login')} style={[styles.altAction, { backgroundColor: palette.surface }]}>
              <View style={styles.altActionRow}>
                <Feather name={action.label.includes('Google') ? 'chrome' : 'smartphone'} size={16} color={palette.text} />
                <Text style={[styles.altActionLabel, { color: palette.text }]}>{action.label}</Text>
              </View>
              <Text style={[styles.altActionNote, { color: palette.muted }]}>{action.note}</Text>
            </Pressable>
          ))}
        </View>

        <View style={[styles.guestStrip, { borderTopColor: palette.border }]}>
          <View style={styles.guestCopyWrap}>
            <Text style={[styles.guestTitle, { color: palette.text }]}>Continue as guest</Text>
            <Text style={[styles.guestCopy, { color: palette.muted }]}>
              Browse the feed, marketplace, and communities now, then sign in later for comments, saves, and orders.
            </Text>
          </View>
          <Pressable onPress={handleGuest} style={[styles.guestButton, { backgroundColor: palette.backgroundSecondary }]}>
            <Text style={[styles.guestButtonText, { color: palette.text }]}>Browse</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 18, gap: 18, paddingBottom: 36 },
  heroMediaWrap: { alignItems: 'center' },
  heroImage: { width: '100%', height: 280, borderRadius: 34, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  heroGlowLarge: { position: 'absolute', width: 220, height: 220, borderRadius: 999, right: -50, top: -70 },
  heroGlowSmall: { position: 'absolute', width: 140, height: 140, borderRadius: 999, left: -28, bottom: -22 },
  photoCircle: { width: 170, height: 170, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  photoInner: { position: 'absolute', width: 136, height: 136, borderRadius: 999 },
  photoBody: { position: 'absolute', width: 72, height: 92, borderRadius: 28, bottom: 26 },
  photoBasket: { position: 'absolute', width: 54, height: 28, borderRadius: 14, right: 34, bottom: 44 },
  heroCopy: { gap: 10 },
  brandBadge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', gap: 8, alignItems: 'center' },
  brandBadgeText: { fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '700' },
  eyebrow: { fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.4 },
  heading: { fontFamily: Fonts.rounded, fontSize: 34, fontWeight: '700', lineHeight: 40 },
  subheading: { fontFamily: Fonts.sans, fontSize: 15, lineHeight: 22 },
  featureList: { gap: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  featureDot: { width: 10, height: 10, borderRadius: 999, marginTop: 7 },
  featureText: { flex: 1, fontFamily: Fonts.sans, fontSize: 14, lineHeight: 21 },
  primaryActions: { gap: 10 },
  primaryButton: { borderRadius: 999, paddingVertical: 16, alignItems: 'center' },
  primaryButtonText: { color: '#ffffff', fontFamily: Fonts.rounded, fontSize: 15, fontWeight: '700' },
  secondaryButton: { borderRadius: 999, paddingVertical: 16, alignItems: 'center' },
  secondaryButtonText: { fontFamily: Fonts.rounded, fontSize: 15, fontWeight: '700' },
  moreWays: { gap: 10 },
  altAction: { borderRadius: 24, padding: 16, gap: 5 },
  altActionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  altActionLabel: { fontFamily: Fonts.rounded, fontSize: 14, fontWeight: '700' },
  altActionNote: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19 },
  guestStrip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 16 },
  guestCopyWrap: { flex: 1, gap: 4 },
  guestTitle: { fontFamily: Fonts.rounded, fontSize: 16, fontWeight: '700' },
  guestCopy: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19 },
  guestButton: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 12 },
  guestButtonText: { fontFamily: Fonts.rounded, fontSize: 13, fontWeight: '700' },
});
