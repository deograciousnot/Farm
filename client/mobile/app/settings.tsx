import AsyncStorage from '@react-native-async-storage/async-storage';
import Feather from '@expo/vector-icons/Feather';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { api, isStaleSessionError } from '@/lib/api';
import type { ProfileResponse } from '@/lib/types';
import { useSession } from '@/providers/session-provider';

const SETTINGS_STORAGE_KEY = 'farmconnect.settings.preferences';

type PreferenceKey =
  | 'likesAndComments'
  | 'orderUpdates'
  | 'communityReplies'
  | 'marketplaceAlerts'
  | 'showPhoneOnProfile'
  | 'publicActivity'
  | 'autoplayMedia'
  | 'dataSaver';

type Preferences = Record<PreferenceKey, boolean>;

type SettingsRow = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  hint: string;
  action: () => void;
  tone?: 'default' | 'danger';
};

const defaultPreferences: Preferences = {
  likesAndComments: true,
  orderUpdates: true,
  communityReplies: true,
  marketplaceAlerts: false,
  showPhoneOnProfile: false,
  publicActivity: true,
  autoplayMedia: true,
  dataSaver: false,
};

export default function SettingsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { clearDeletedAccount, logout, logoutToGuest, token, user, mode } = useSession();
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [isPreferencesReady, setIsPreferencesReady] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [activity, setActivity] = useState<ProfileResponse['remarks'] | null>(null);

  const isAuthenticated = Boolean(token && user);
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  useEffect(() => {
    let isMounted = true;

    async function loadPreferences() {
      try {
        const storedPreferences = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);

        if (!isMounted) {
          return;
        }

        if (storedPreferences) {
          setPreferences({ ...defaultPreferences, ...(JSON.parse(storedPreferences) as Partial<Preferences>) });
        }
      } catch (error) {
        console.warn('Failed to load FarmConnect settings.', error);
      } finally {
        if (isMounted) {
          setIsPreferencesReady(true);
        }
      }
    }

    void loadPreferences();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadActivity() {
      if (!token) {
        setActivity(null);
        return;
      }

      try {
        const response = await api.getProfile(token);

        if (isMounted) {
          setActivity(response.remarks);
        }
      } catch (error) {
        if (isStaleSessionError(error)) {
          await clearDeletedAccount();
          return;
        }

        console.warn('Failed to load account activity.', error);
      }
    }

    void loadActivity();

    return () => {
      isMounted = false;
    };
  }, [clearDeletedAccount, token]);

  const profileRows: SettingsRow[] = [
    {
      icon: 'edit-3',
      label: 'Edit profile',
      hint: 'Update your name, bio, avatar, location, phone, and interests.',
      action: () => router.push('/(tabs)/profile?edit=1'),
    },
    {
      icon: 'grid',
      label: 'My posts',
      hint: 'Review or remove the knowledge and market stories you have shared.',
      action: () => router.push('/(tabs)/profile?tab=posts'),
    },
    {
      icon: 'shopping-bag',
      label: 'My listings',
      hint: 'Jump straight into the marketplace items tied to your account.',
      action: () => router.push('/(tabs)/profile?tab=listings'),
    },
    {
      icon: 'share-2',
      label: 'Share profile',
      hint: 'Send your FarmConnect identity to a buyer, farmer, or community member.',
      action: handleShareProfile,
    },
  ];

  const socialRows: SettingsRow[] = [
    {
      icon: 'users',
      label: 'Followers',
      hint: 'See who follows your farm, buyer, or community profile.',
      action: () => router.push('/(tabs)/profile?tab=followers'),
    },
    {
      icon: 'user-check',
      label: 'Following',
      hint: 'Review the people and sellers you follow.',
      action: () => router.push('/(tabs)/profile?tab=following'),
    },
    {
      icon: 'bell',
      label: 'Notifications',
      hint: 'Catch up on likes, comments, replies, and order activity.',
      action: () => router.push('/(tabs)/profile'),
    },
  ];

  async function persistPreferences(nextPreferences: Preferences) {
    setPreferences(nextPreferences);
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextPreferences));
  }

  function togglePreference(key: PreferenceKey) {
    const nextPreferences = { ...preferences, [key]: !preferences[key] };
    void persistPreferences(nextPreferences);
  }

  async function handleShareProfile() {
    const displayName = user?.name ?? 'FarmConnect';
    const location = user?.location ? ` in ${user.location}` : '';
    const role = user?.role ? `${user.role} profile` : 'profile';

    await Share.share({
      message: `${displayName}'s FarmConnect ${role}${location}.`,
    });
  }

  async function handleContactSupport() {
    const subject = encodeURIComponent('FarmConnect support request');
    const body = encodeURIComponent(`Account: ${user?.email ?? 'Guest'}\nApp version: ${appVersion}\n\nTell us what happened:\n`);
    const mailUrl = `mailto:support@farmconnect.app?subject=${subject}&body=${body}`;
    const canOpenMail = await Linking.canOpenURL(mailUrl);

    if (canOpenMail) {
      await Linking.openURL(mailUrl);
      return;
    }

    Alert.alert('Support', 'Email support@farmconnect.app and include what happened plus your account email.');
  }

  function handleGuestSignIn() {
    router.push('/auth?mode=login');
  }

  function handleLogoutPress() {
    Alert.alert('Switch account', 'Choose how you want to leave this account.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Browse as guest', onPress: () => void logoutToGuest() },
      { text: 'Log out', style: 'destructive', onPress: () => void logout() },
    ]);
  }

  async function handleChangePassword() {
    if (!token) {
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Password too short', 'Use at least 6 characters for your new password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Confirm the same new password before saving.');
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await api.changePassword(token, { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Security updated', response.message);
    } catch (error) {
      Alert.alert('Password update failed', error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setIsChangingPassword(false);
    }
  }

  function handleDeleteAccountPress() {
    if (!token || !deletePassword || deleteConfirmation !== 'DELETE') {
      Alert.alert('Confirm deletion', 'Enter your current password and type DELETE before deleting the account.');
      return;
    }

    Alert.alert(
      'Delete account permanently?',
      'FarmConnect will erase your profile, posts, listings, comments, replies, followers, saved posts, and notifications. Order records are retained only where needed for transaction history, with personal delivery details removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete account', style: 'destructive', onPress: () => void handleDeleteAccount() },
      ]
    );
  }

  async function handleDeleteAccount() {
    if (!token) {
      return;
    }

    setIsDeletingAccount(true);

    try {
      const response = await api.deleteAccount(token, {
        currentPassword: deletePassword,
        confirmation: deleteConfirmation,
      });
      setDeletePassword('');
      setDeleteConfirmation('');
      Alert.alert('Account deleted', response.message);
      await clearDeletedAccount();
    } catch (error) {
      Alert.alert('Deletion failed', error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setIsDeletingAccount(false);
    }
  }

  function renderActionRow(item: SettingsRow) {
    const textColor = item.tone === 'danger' ? palette.accent : palette.text;

    return (
      <Pressable
        key={item.label}
        onPress={item.action}
        style={({ pressed }) => [
          styles.rowCard,
          { backgroundColor: palette.surface, opacity: pressed ? 0.72 : 1 },
        ]}>
        <View style={[styles.rowIcon, { backgroundColor: item.tone === 'danger' ? `${palette.accent}14` : palette.backgroundSecondary }]}>
          <Feather name={item.icon} size={17} color={item.tone === 'danger' ? palette.accent : palette.tint} />
        </View>
        <View style={styles.rowCopy}>
          <Text style={[styles.rowTitle, { color: textColor }]}>{item.label}</Text>
          <Text style={[styles.rowHint, { color: palette.muted }]}>{item.hint}</Text>
        </View>
        <Feather name="chevron-right" size={18} color={palette.muted} />
      </Pressable>
    );
  }

  function renderSwitchRow(key: PreferenceKey, label: string, hint: string, icon: keyof typeof Feather.glyphMap) {
    return (
      <View key={key} style={[styles.rowCard, { backgroundColor: palette.surface }]}>
        <View style={[styles.rowIcon, { backgroundColor: palette.backgroundSecondary }]}>
          <Feather name={icon} size={17} color={palette.tint} />
        </View>
        <View style={styles.rowCopy}>
          <Text style={[styles.rowTitle, { color: palette.text }]}>{label}</Text>
          <Text style={[styles.rowHint, { color: palette.muted }]}>{hint}</Text>
        </View>
        <Switch
          value={preferences[key]}
          onValueChange={() => togglePreference(key)}
          trackColor={{ false: palette.overlay, true: `${palette.tint}55` }}
          thumbColor={preferences[key] ? palette.tint : palette.surfaceRaised}
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={[styles.iconButton, { backgroundColor: palette.surface }]}>
            <Feather name="arrow-left" size={18} color={palette.text} />
          </Pressable>
          <Text style={[styles.topBarTitle, { color: palette.text }]}>Settings</Text>
          <Pressable onPress={handleContactSupport} style={[styles.iconButton, { backgroundColor: palette.surface }]}>
            <Feather name="help-circle" size={18} color={palette.text} />
          </Pressable>
        </View>

        <View style={[styles.accountCard, { backgroundColor: palette.backgroundSecondary }]}>
          <View style={styles.accountTop}>
            <View style={[styles.avatar, { backgroundColor: palette.tint }]}>
              <Text style={styles.avatarText}>{(user?.name ?? 'F').slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={styles.accountCopy}>
              <Text style={[styles.accountName, { color: palette.text }]}>{user?.name ?? 'Guest browsing'}</Text>
              <Text style={[styles.accountMeta, { color: palette.muted }]} selectable>
                {user?.email ?? 'Sign in to sync your profile, orders, and trust history.'}
              </Text>
            </View>
          </View>
          <View style={styles.accountStats}>
            <View style={[styles.statPill, { backgroundColor: palette.surface }]}>
              <Text style={[styles.statValue, { color: palette.text }]}>{user?.trustScore?.toFixed(1) ?? '0.0'}</Text>
              <Text style={[styles.statLabel, { color: palette.muted }]}>Trust</Text>
            </View>
            <View style={[styles.statPill, { backgroundColor: palette.surface }]}>
              <Text style={[styles.statValue, { color: palette.text }]}>{user?.followersCount ?? 0}</Text>
              <Text style={[styles.statLabel, { color: palette.muted }]}>Followers</Text>
            </View>
            <View style={[styles.statPill, { backgroundColor: palette.surface }]}>
              <Text style={[styles.statValue, { color: palette.text }]}>{mode === 'guest' ? 'Guest' : user?.role ?? 'Member'}</Text>
              <Text style={[styles.statLabel, { color: palette.muted }]}>Mode</Text>
            </View>
          </View>
        </View>

        {!isPreferencesReady ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={palette.tint} />
          </View>
        ) : (
          <>
            {isAuthenticated ? (
              <>
                <SettingsSection title="Profile">{profileRows.map(renderActionRow)}</SettingsSection>
                <SettingsSection title="Social">{socialRows.map(renderActionRow)}</SettingsSection>
              </>
            ) : (
              <View style={[styles.guestCard, { backgroundColor: palette.surface }]}>
                <Text style={[styles.guestTitle, { color: palette.text }]}>Account tools unlock after sign in.</Text>
                <Text style={[styles.guestCopy, { color: palette.muted }]}>
                  You can keep browsing as guest, but profile edits, followers, listings, notifications, and security settings need an account.
                </Text>
                <Pressable onPress={handleGuestSignIn} style={[styles.primaryButton, { backgroundColor: palette.tint }]}>
                  <Text style={styles.primaryButtonText}>Sign in</Text>
                </Pressable>
              </View>
            )}

            <SettingsSection title="Notifications">
              {renderSwitchRow('likesAndComments', 'Likes and comments', 'Alerts when people react to your feed posts.', 'heart')}
              {renderSwitchRow('orderUpdates', 'Order updates', 'Delivery, buyer, and seller activity on your orders.', 'truck')}
              {renderSwitchRow('communityReplies', 'Community replies', 'Replies on discussions and questions you join.', 'message-circle')}
              {renderSwitchRow('marketplaceAlerts', 'Marketplace alerts', 'Price, stock, and buyer-demand prompts on this device.', 'tag')}
            </SettingsSection>

            <SettingsSection title="Privacy">
              {renderSwitchRow('showPhoneOnProfile', 'Show phone on profile', 'Controls whether your phone should be shown in future profile privacy flows.', 'phone')}
              {renderSwitchRow('publicActivity', 'Public activity signals', 'Let your public profile show recent posts, listings, and social counts.', 'eye')}
            </SettingsSection>

            <SettingsSection title="App preferences">
              {renderSwitchRow('autoplayMedia', 'Autoplay feed media', 'Play feed videos when they become visible.', 'play-circle')}
              {renderSwitchRow('dataSaver', 'Data saver', 'Prefer lighter media behavior while browsing.', 'wifi-off')}
            </SettingsSection>

            {isAuthenticated ? (
              <SettingsSection title="Activity">
                <View style={[styles.activityCard, { backgroundColor: palette.surface }]}>
                  <Text style={[styles.activityTitle, { color: palette.text }]}>Remarks about you</Text>
                  {activity?.received.length ? (
                    activity.received.slice(0, 3).map((remark) => (
                      <View key={remark._id} style={[styles.activityRow, { borderBottomColor: palette.border }]}>
                        <View style={styles.activityRowTop}>
                          <Text style={[styles.activityName, { color: palette.text }]}>{remark.buyer.name}</Text>
                          <Text style={[styles.activityRating, { color: palette.tint }]}>{remark.rating}/5</Text>
                        </View>
                        <Text style={[styles.activityBody, { color: palette.muted }]}>{remark.body}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={[styles.activityBody, { color: palette.muted }]}>No seller remarks received yet.</Text>
                  )}
                </View>
                <View style={[styles.activityCard, { backgroundColor: palette.surface }]}>
                  <Text style={[styles.activityTitle, { color: palette.text }]}>Remarks you left</Text>
                  {activity?.given.length ? (
                    activity.given.slice(0, 3).map((remark) => (
                      <View key={remark._id} style={[styles.activityRow, { borderBottomColor: palette.border }]}>
                        <View style={styles.activityRowTop}>
                          <Text style={[styles.activityName, { color: palette.text }]}>{remark.seller.name}</Text>
                          <Text style={[styles.activityRating, { color: palette.tint }]}>{remark.rating}/5</Text>
                        </View>
                        <Text style={[styles.activityBody, { color: palette.muted }]}>{remark.body}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={[styles.activityBody, { color: palette.muted }]}>Complete a buyer order to leave your first seller remark.</Text>
                  )}
                </View>
              </SettingsSection>
            ) : null}

            {isAuthenticated ? (
              <SettingsSection title="Login and security">
                <View style={[styles.securityCard, { backgroundColor: palette.surface }]}>
                  <TextInput
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="Current password"
                    placeholderTextColor={palette.muted}
                    secureTextEntry
                    style={[styles.input, { color: palette.text, borderColor: palette.border }]}
                  />
                  <TextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="New password"
                    placeholderTextColor={palette.muted}
                    secureTextEntry
                    style={[styles.input, { color: palette.text, borderColor: palette.border }]}
                  />
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm new password"
                    placeholderTextColor={palette.muted}
                    secureTextEntry
                    style={[styles.input, { color: palette.text, borderColor: palette.border }]}
                  />
                  <Pressable
                    disabled={isChangingPassword}
                    onPress={handleChangePassword}
                    style={[styles.primaryButton, { backgroundColor: palette.tint, opacity: isChangingPassword ? 0.65 : 1 }]}>
                    <Text style={styles.primaryButtonText}>{isChangingPassword ? 'Updating...' : 'Update password'}</Text>
                  </Pressable>
                </View>
              </SettingsSection>
            ) : null}

            {isAuthenticated ? (
              <SettingsSection title="Data protection">
                <View style={[styles.securityCard, styles.dangerCard, { backgroundColor: palette.surface, borderColor: `${palette.accent}55` }]}>
                  <View style={styles.dpaHeader}>
                    <View style={[styles.rowIcon, { backgroundColor: `${palette.accent}14` }]}>
                      <Feather name="shield" size={17} color={palette.accent} />
                    </View>
                    <View style={styles.rowCopy}>
                      <Text style={[styles.rowTitle, { color: palette.text }]}>Delete account and data</Text>
                      <Text style={[styles.rowHint, { color: palette.muted }]}>
                        DPA-aligned erasure removes profile data, posts, listings, social activity, notifications, and saved content. Transaction records keep only the minimum order history needed for accountability.
                      </Text>
                    </View>
                  </View>
                  <TextInput
                    value={deletePassword}
                    onChangeText={setDeletePassword}
                    placeholder="Current password"
                    placeholderTextColor={palette.muted}
                    secureTextEntry
                    style={[styles.input, { color: palette.text, borderColor: palette.border }]}
                  />
                  <TextInput
                    value={deleteConfirmation}
                    onChangeText={setDeleteConfirmation}
                    placeholder="Type DELETE"
                    placeholderTextColor={palette.muted}
                    autoCapitalize="characters"
                    style={[styles.input, { color: palette.text, borderColor: palette.border }]}
                  />
                  <Pressable
                    disabled={isDeletingAccount}
                    onPress={handleDeleteAccountPress}
                    style={[styles.primaryButton, { backgroundColor: palette.accent, opacity: isDeletingAccount ? 0.65 : 1 }]}>
                    <Text style={styles.primaryButtonText}>{isDeletingAccount ? 'Deleting...' : 'Delete account'}</Text>
                  </Pressable>
                </View>
              </SettingsSection>
            ) : null}

            <SettingsSection title="Support">
              {renderActionRow({
                icon: 'mail',
                label: 'Help and support',
                hint: 'Contact support with your account and app version attached.',
                action: handleContactSupport,
              })}
              {renderActionRow({
                icon: isAuthenticated ? 'log-out' : 'log-in',
                label: isAuthenticated ? 'Log out or switch account' : 'Sign in to FarmConnect',
                hint: isAuthenticated ? 'Leave this account or continue browsing as guest.' : 'Connect a profile to sync activity.',
                action: isAuthenticated ? handleLogoutPress : handleGuestSignIn,
                tone: isAuthenticated ? 'danger' : 'default',
              })}
            </SettingsSection>

            <Text style={[styles.footer, { color: palette.muted }]} selectable>
              FarmConnect {appVersion} · {api.baseUrl}
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: palette.text }]}>{title}</Text>
      <View style={styles.sectionRows}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 18, gap: 18, paddingBottom: 40 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: { width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { fontFamily: Fonts.rounded, fontSize: 18, fontWeight: '700' },
  accountCard: { borderRadius: 24, padding: 16, gap: 16 },
  accountTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 56, height: 56, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontFamily: Fonts.rounded, fontSize: 24, fontWeight: '800' },
  accountCopy: { flex: 1, gap: 4 },
  accountName: { fontFamily: Fonts.rounded, fontSize: 24, fontWeight: '800', lineHeight: 29 },
  accountMeta: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19 },
  accountStats: { flexDirection: 'row', gap: 8 },
  statPill: { flex: 1, borderRadius: 16, padding: 10, gap: 3 },
  statValue: { fontFamily: Fonts.rounded, fontSize: 15, fontWeight: '800' },
  statLabel: { fontFamily: Fonts.sans, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  loadingWrap: { paddingVertical: 30 },
  section: { gap: 10 },
  sectionTitle: { fontFamily: Fonts.rounded, fontSize: 17, fontWeight: '800' },
  sectionRows: { gap: 10 },
  rowCard: { borderRadius: 18, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center' },
  rowIcon: { width: 36, height: 36, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  rowCopy: { flex: 1, gap: 4 },
  rowTitle: { fontFamily: Fonts.rounded, fontSize: 15, fontWeight: '800' },
  rowHint: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19 },
  guestCard: { borderRadius: 20, padding: 16, gap: 12 },
  guestTitle: { fontFamily: Fonts.rounded, fontSize: 18, fontWeight: '800' },
  guestCopy: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 21 },
  activityCard: { borderRadius: 18, padding: 14, gap: 10 },
  activityTitle: { fontFamily: Fonts.rounded, fontSize: 15, fontWeight: '800' },
  activityRow: { gap: 5, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  activityRowTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  activityName: { fontFamily: Fonts.rounded, fontSize: 13, fontWeight: '800' },
  activityRating: { fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '800' },
  activityBody: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19 },
  securityCard: { borderRadius: 18, padding: 14, gap: 10 },
  dangerCard: { borderWidth: StyleSheet.hairlineWidth },
  dpaHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  input: {
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontFamily: Fonts.sans,
    fontSize: 14,
  },
  primaryButton: { minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  primaryButtonText: { color: '#FFFFFF', fontFamily: Fonts.rounded, fontSize: 14, fontWeight: '800' },
  footer: { fontFamily: Fonts.sans, fontSize: 12, lineHeight: 18, textAlign: 'center', paddingTop: 6 },
});
