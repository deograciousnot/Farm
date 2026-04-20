import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSession } from '@/providers/session-provider';

export default function SettingsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { logout, logoutToGuest, user } = useSession();

  const sections = [
    {
      title: 'Profile',
      items: [
        { label: 'Edit profile', hint: 'Update your name, bio, avatar, and interests.', action: () => router.push('/(tabs)/profile?edit=1') },
        { label: 'My posts', hint: 'Manage the knowledge and market stories you have shared.', action: () => router.push('/(tabs)/profile?tab=posts') },
        { label: 'My listings', hint: 'Jump straight into your marketplace items.', action: () => router.push('/(tabs)/profile?tab=listings') },
      ],
    },
    {
      title: 'Social',
      items: [
        { label: 'Followers', hint: 'See who is following your farm or seller account.', action: () => router.push('/(tabs)/profile?tab=followers') },
        { label: 'Following', hint: 'Review the people and sellers you follow.', action: () => router.push('/(tabs)/profile?tab=following') },
        { label: 'Notifications', hint: 'Catch up on likes, comments, replies, and orders.', action: () => router.push('/(tabs)/profile') },
      ],
    },
    {
      title: 'Account',
      items: [
        { label: 'Continue as guest', hint: 'Quickly step out of your account without leaving the app.', action: () => void logoutToGuest() },
        { label: 'Login and security', hint: 'Password changes, trusted devices, and sessions.', action: () => handlePlaceholder('Login and security') },
        { label: 'Help and support', hint: 'Get assistance or report an issue.', action: () => handlePlaceholder('Help and support') },
      ],
    },
  ];

  function handlePlaceholder(label: string) {
    Alert.alert(label, 'This screen is the right home for it. I can wire the full behavior next.');
  }

  function handleLogoutPress() {
    Alert.alert('Switch account', 'Do you want to keep browsing as guest or log out fully to the sign-in screen?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Browse as guest', onPress: () => void logoutToGuest() },
      { text: 'Log out', style: 'destructive', onPress: () => void logout() },
    ]);
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={[styles.iconButton, { backgroundColor: palette.surface }]}>
            <Feather name="arrow-left" size={18} color={palette.text} />
          </Pressable>
          <Text style={[styles.topBarTitle, { color: palette.text }]}>Settings</Text>
          <View style={styles.spacer} />
        </View>

        <View style={[styles.hero, { backgroundColor: palette.backgroundSecondary }]}>
          <Text style={[styles.heroEyebrow, { color: palette.tint }]}>Account</Text>
          <Text style={[styles.heroTitle, { color: palette.text }]}>{user?.name || 'FarmConnect'} settings</Text>
          <Text style={[styles.heroCopy, { color: palette.muted }]}>
            Activity, privacy, and account management belong here so the profile stays cleaner and more social.
          </Text>
        </View>

        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>{section.title}</Text>
            <View style={styles.sectionRows}>
              {section.items.map((item) => (
                <Pressable key={item.label} onPress={item.action} style={[styles.rowCard, { backgroundColor: palette.surface }]}>
                  <View style={styles.rowCopy}>
                    <Text style={[styles.rowTitle, { color: palette.text }]}>{item.label}</Text>
                    <Text style={[styles.rowHint, { color: palette.muted }]}>{item.hint}</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={palette.muted} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.bottomActions}>
          <Pressable onPress={() => router.push('/(tabs)/profile')} style={[styles.secondaryButton, { backgroundColor: palette.surface }]}>
            <Text style={[styles.secondaryButtonText, { color: palette.text }]}>Back to profile</Text>
          </Pressable>
          <Pressable onPress={handleLogoutPress} style={[styles.logoutButton, { backgroundColor: palette.surface }]}>
            <Text style={[styles.logoutText, { color: palette.accent }]}>Log out or switch account</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 18, gap: 18, paddingBottom: 40 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: { width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { fontFamily: Fonts.rounded, fontSize: 18, fontWeight: '700' },
  spacer: { width: 40 },
  hero: { borderRadius: 28, padding: 18, gap: 8 },
  heroEyebrow: { fontFamily: Fonts.rounded, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2 },
  heroTitle: { fontFamily: Fonts.rounded, fontSize: 28, fontWeight: '700', lineHeight: 34 },
  heroCopy: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 21 },
  section: { gap: 10 },
  sectionTitle: { fontFamily: Fonts.rounded, fontSize: 18, fontWeight: '700' },
  sectionRows: { gap: 10 },
  rowCard: { borderRadius: 20, padding: 15, flexDirection: 'row', gap: 12, alignItems: 'center' },
  rowCopy: { flex: 1, gap: 4 },
  rowTitle: { fontFamily: Fonts.rounded, fontSize: 15, fontWeight: '700' },
  rowHint: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19 },
  bottomActions: { paddingTop: 8 },
  secondaryButton: { borderRadius: 18, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  secondaryButtonText: { fontFamily: Fonts.rounded, fontSize: 14, fontWeight: '700' },
  logoutButton: { borderRadius: 18, paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  logoutText: { fontFamily: Fonts.rounded, fontSize: 14, fontWeight: '700' },
});
