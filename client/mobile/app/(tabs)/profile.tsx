import Feather from '@expo/vector-icons/Feather';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { SectionCard } from '@/components/section-card';
import { SocialAvatar } from '@/components/social-avatar';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { api } from '@/lib/api';
import type { NotificationItem, ProfileResponse, UploadableAsset } from '@/lib/types';
import { useSession } from '@/providers/session-provider';

const roleNotes = [
  'Seller/farmer accounts get listings, trust metrics, and order tools.',
  'Buyer accounts focus on discovery, saved suppliers, and purchasing.',
  'Hobbyists browse and share like buyers, but without seller privileges.',
];

export default function ProfileScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { token, isLoading: isSessionLoading, logout, logoutToGuest, updateUser } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileResponse | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftLocation, setDraftLocation] = useState('');
  const [draftBio, setDraftBio] = useState('');
  const [draftPhone, setDraftPhone] = useState('');
  const [draftInterests, setDraftInterests] = useState('');
  const [draftAvatar, setDraftAvatar] = useState<UploadableAsset | null>(null);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [activeNotificationId, setActiveNotificationId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    const authToken = token;

    let isMounted = true;

    async function loadProfile() {
      try {
        const response = await api.getProfile(authToken);

        if (!isMounted) {
          return;
        }

        setProfileData(response);
        setDraftName(response.profile.name ?? '');
        setDraftLocation(response.profile.location ?? '');
        setDraftBio(response.profile.bio ?? '');
        setDraftPhone(response.profile.phone ?? '');
        setDraftInterests((response.profile.interests ?? []).join(', '));
      } catch (error) {
        console.warn('Failed to load profile.', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const showLoading = isSessionLoading || isLoading;
  const profile = profileData?.profile;
  const metrics = profileData?.metrics;
  const unreadCount = profileData?.notificationMeta.unreadCount ?? 0;

  function formatRelativeTime(value: string) {
    const date = new Date(value);
    const diffMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / (1000 * 60)));

    if (diffMinutes < 1) {
      return 'Just now';
    }

    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    }

    const diffHours = Math.floor(diffMinutes / 60);

    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  function getNotificationTheme(item: NotificationItem) {
    switch (item.type) {
      case 'like':
        return { icon: 'heart', tint: palette.accent };
      case 'comment':
        return { icon: 'message-circle', tint: palette.tint };
      case 'reply':
        return { icon: 'corner-down-left', tint: palette.accentSecondary };
      case 'order':
        return { icon: 'shopping-bag', tint: palette.success };
      case 'community':
        return { icon: 'users', tint: palette.tint };
      default:
        return { icon: 'bell', tint: palette.text };
    }
  }

  async function handleMarkNotificationRead(notificationId: string) {
    if (!token) {
      return;
    }

    setActiveNotificationId(notificationId);

    try {
      const response = await api.markNotificationRead(token, notificationId);
      setProfileData((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          notificationMeta: {
            unreadCount: response.unreadCount,
          },
          notifications: current.notifications.map((item) =>
            item._id === notificationId ? { ...item, isRead: true } : item
          ),
        };
      });
    } catch (error) {
      Alert.alert('Notification update failed', error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setActiveNotificationId(null);
    }
  }

  async function handleMarkAllRead() {
    if (!token || !unreadCount) {
      return;
    }

    setIsMarkingAllRead(true);

    try {
      const response = await api.markAllNotificationsRead(token);
      setProfileData((current) =>
        current
          ? {
              ...current,
              notificationMeta: {
                unreadCount: response.unreadCount,
              },
              notifications: response.items,
            }
          : current
      );
    } catch (error) {
      Alert.alert('Notification update failed', error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setIsMarkingAllRead(false);
    }
  }

  function handleLogoutPress() {
    Alert.alert('Switch account', 'Do you want to keep browsing as guest or log out fully to the sign-in screen?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Browse as guest',
        onPress: () => {
          void logoutToGuest();
        },
      },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => {
          void logout();
        },
      },
    ]);
  }

  async function pickAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo access so you can choose a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];

    setDraftAvatar({
      uri: asset.uri,
      type: asset.mimeType || 'image/jpeg',
      name: asset.fileName || `farmconnect-profile-${Date.now()}.jpg`,
    });
  }

  async function handleSaveProfile() {
    if (!token) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await api.updateProfile(token, {
        name: draftName.trim(),
        location: draftLocation.trim(),
        bio: draftBio.trim(),
        phone: draftPhone.trim(),
        interests: draftInterests
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        avatar: draftAvatar,
      });

      setProfileData((current) =>
        current
          ? {
              ...current,
              profile: response.user,
            }
          : current
      );
      await updateUser(response.user);
      setDraftAvatar(null);
      setIsEditing(false);
    } catch (error) {
      Alert.alert('Profile update failed', error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: palette.background }]}
      contentContainerStyle={styles.content}>
      {!token ? (
        <View style={[styles.guestHero, { backgroundColor: palette.backgroundSecondary }]}>
          <View style={[styles.profileGlow, { backgroundColor: `${palette.accent}20` }]} />
          <View style={[styles.profileCard, { backgroundColor: palette.surfaceRaised, borderColor: palette.border }]}>
            <Text style={[styles.role, { color: palette.tint }]}>Guest mode</Text>
            <Text style={[styles.name, { color: palette.text }]}>Your profile starts after sign-in</Text>
            <Text style={[styles.bio, { color: palette.muted }]}>
              Create an account to get your avatar, role-based profile, trust score, saved posts, and seller or buyer tools.
            </Text>
          </View>
        </View>
      ) : (
      <View style={[styles.profileShell, { backgroundColor: palette.backgroundSecondary }]}>
        <View style={[styles.profileGlow, { backgroundColor: `${palette.accent}20` }]} />

        <View style={[styles.profileCard, { backgroundColor: palette.surfaceRaised, borderColor: palette.border }]}>
          {showLoading || !profile ? (
            <View style={styles.loadingShell}>
              <ActivityIndicator color={palette.tint} />
            </View>
          ) : (
            <>
              <View style={styles.profileHeader}>
                <View style={styles.profileIdentity}>
                  <View>
                    <SocialAvatar name={profile.name} imageUrl={draftAvatar?.uri || profile.avatarUrl} size={72} />
                    {isEditing ? (
                      <Pressable onPress={pickAvatar} style={[styles.avatarEditButton, { backgroundColor: palette.tint }]}>
                        <Feather name="camera" size={13} color="#ffffff" />
                      </Pressable>
                    ) : null}
                  </View>
                  <View style={styles.headerText}>
                    <Text style={[styles.role, { color: palette.tint }]}>{profile.role}</Text>
                    {isEditing ? (
                      <>
                        <TextInput
                          value={draftName}
                          onChangeText={setDraftName}
                          placeholder="Name"
                          placeholderTextColor={palette.muted}
                          style={[styles.inlineInput, { color: palette.text, backgroundColor: palette.surface }]}
                        />
                        <TextInput
                          value={draftLocation}
                          onChangeText={setDraftLocation}
                          placeholder="Location"
                          placeholderTextColor={palette.muted}
                          style={[styles.inlineInput, { color: palette.text, backgroundColor: palette.surface }]}
                        />
                      </>
                    ) : (
                      <>
                        <Text style={[styles.name, { color: palette.text }]}>{profile.name}</Text>
                        <Text style={[styles.meta, { color: palette.muted }]}>
                          {profile.location} - {profile.phone}
                        </Text>
                      </>
                    )}
                  </View>
                </View>
                <View style={[styles.reputationBadge, { backgroundColor: `${palette.success}18` }]}>
                  <Text style={[styles.reputationBadgeText, { color: palette.success }]}>
                    {profile.verificationStatus || 'active'}
                  </Text>
                </View>
              </View>

              {isEditing ? (
                <View style={styles.editFields}>
                  <TextInput
                    value={draftBio}
                    onChangeText={setDraftBio}
                    placeholder="Bio"
                    placeholderTextColor={palette.muted}
                    multiline
                    style={[styles.bioInput, { color: palette.text, backgroundColor: palette.surface }]}
                  />
                  <TextInput
                    value={draftPhone}
                    onChangeText={setDraftPhone}
                    placeholder="Phone"
                    placeholderTextColor={palette.muted}
                    style={[styles.inlineInput, { color: palette.text, backgroundColor: palette.surface }]}
                  />
                  <TextInput
                    value={draftInterests}
                    onChangeText={setDraftInterests}
                    placeholder="Interests separated by commas"
                    placeholderTextColor={palette.muted}
                    style={[styles.inlineInput, { color: palette.text, backgroundColor: palette.surface }]}
                  />
                </View>
              ) : (
                <Text style={[styles.bio, { color: palette.text }]}>{profile.bio}</Text>
              )}
              <Text style={[styles.reputation, { color: palette.success }]}>
                Trust score {profile.trustScore?.toFixed(1) ?? '0.0'}
              </Text>
              <View style={styles.profileActions}>
                {isEditing ? (
                  <>
                    <Pressable onPress={() => setIsEditing(false)} style={[styles.secondaryAction, { backgroundColor: palette.surface }]}>
                      <Text style={[styles.secondaryActionText, { color: palette.text }]}>Cancel</Text>
                    </Pressable>
                    <Pressable onPress={handleSaveProfile} style={[styles.primaryAction, { backgroundColor: palette.tint }]}>
                      <Text style={styles.primaryActionText}>{isSaving ? 'Saving...' : 'Save profile'}</Text>
                    </Pressable>
                  </>
                ) : (
                  <Pressable onPress={() => setIsEditing(true)} style={[styles.secondaryAction, { backgroundColor: palette.surface }]}>
                    <Text style={[styles.secondaryActionText, { color: palette.text }]}>Edit profile</Text>
                  </Pressable>
                )}
              </View>
            </>
          )}
        </View>
      </View>
      )}

      <View style={styles.grid}>
        <SectionCard title={String(metrics?.posts ?? 0)} subtitle="Posts" accent={palette.tint} />
        <SectionCard title={String(metrics?.listings ?? 0)} subtitle="Listings" accent={palette.accent} />
        <SectionCard title={String(metrics?.orders ?? 0)} subtitle="Orders" accent={palette.accentSecondary} />
      </View>

      <View style={[styles.roleCard, { backgroundColor: palette.surfaceRaised, borderColor: palette.border }]}>
        <Text style={[styles.roleCardTitle, { color: palette.text }]}>Role behavior</Text>
        {roleNotes.map((note) => (
          <View key={note} style={styles.roleRow}>
            <View style={[styles.roleDot, { backgroundColor: palette.accentSecondary }]} />
            <Text style={[styles.roleCopy, { color: palette.muted }]}>{note}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.notificationsCard, { backgroundColor: palette.surfaceRaised, borderColor: palette.border }]}>
        <View style={styles.notificationsHeader}>
          <View style={styles.notificationsTitleRow}>
            <Text style={[styles.notificationsTitle, { color: palette.text }]}>Recent notifications</Text>
            {unreadCount ? (
              <View style={[styles.unreadBadge, { backgroundColor: `${palette.accent}20` }]}>
                <Text style={[styles.unreadBadgeText, { color: palette.accent }]}>
                  {unreadCount} new
                </Text>
              </View>
            ) : null}
          </View>
          <Pressable
            onPress={handleMarkAllRead}
            disabled={!unreadCount || isMarkingAllRead}
            style={[
              styles.markAllButton,
              { backgroundColor: unreadCount ? palette.surface : palette.backgroundSecondary },
            ]}>
            <Text
              style={[
                styles.markAllButtonText,
                { color: unreadCount ? palette.text : palette.muted },
              ]}>
              {isMarkingAllRead ? 'Updating...' : 'Mark all read'}
            </Text>
          </Pressable>
        </View>

        {profileData?.notifications.length ? (
          profileData.notifications.map((item) => {
            const notificationTheme = getNotificationTheme(item);

            return (
              <View
                key={item._id}
                style={[
                  styles.notificationCard,
                  {
                    backgroundColor: item.isRead ? palette.surface : `${notificationTheme.tint}12`,
                    borderColor: item.isRead ? palette.border : `${notificationTheme.tint}28`,
                  },
                ]}>
                <View style={styles.notificationTopRow}>
                  <View style={styles.notificationIdentity}>
                    <View style={[styles.notificationIconWrap, { backgroundColor: `${notificationTheme.tint}18` }]}>
                      <Feather name={notificationTheme.icon as never} size={16} color={notificationTheme.tint} />
                    </View>
                    <View style={styles.notificationTextWrap}>
                      <Text style={[styles.notificationHeading, { color: palette.text }]}>{item.title}</Text>
                      <Text style={[styles.notificationMeta, { color: palette.muted }]}>
                        {formatRelativeTime(item.createdAt)}
                      </Text>
                    </View>
                  </View>
                  {!item.isRead ? (
                    <View style={[styles.notificationDot, { backgroundColor: notificationTheme.tint }]} />
                  ) : null}
                </View>

                <Text style={[styles.notificationBody, { color: palette.muted }]}>{item.body}</Text>

                <View style={styles.notificationActions}>
                  <View style={[styles.notificationTypePill, { backgroundColor: `${notificationTheme.tint}14` }]}>
                    <Text style={[styles.notificationTypeText, { color: notificationTheme.tint }]}>
                      {item.type}
                    </Text>
                  </View>
                  {!item.isRead ? (
                    <Pressable
                      onPress={() => handleMarkNotificationRead(item._id)}
                      disabled={activeNotificationId === item._id}
                      style={[styles.readButton, { backgroundColor: palette.surfaceRaised }]}>
                      <Text style={[styles.readButtonText, { color: palette.text }]}>
                        {activeNotificationId === item._id ? 'Saving...' : 'Mark read'}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })
        ) : (
          <View style={[styles.emptyNotifications, { backgroundColor: palette.surface }]}>
            <Feather name="bell-off" size={18} color={palette.muted} />
            <Text style={[styles.emptyNotificationsText, { color: palette.muted }]}>
              No notifications yet. Activity from likes, comments, replies, and orders will show up here.
            </Text>
          </View>
        )}
      </View>

      {token ? (
        <Pressable onPress={handleLogoutPress} style={[styles.logoutButton, { backgroundColor: palette.accent }]}>
          <Text style={styles.logoutButtonText}>Log out</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 18, gap: 18, paddingBottom: 36 },
  guestHero: { borderRadius: 32, padding: 12, overflow: 'hidden' },
  profileShell: { borderRadius: 32, padding: 12, overflow: 'hidden' },
  profileGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 999,
    right: -30,
    top: -42,
  },
  profileCard: { borderRadius: 28, borderWidth: 1, padding: 22, gap: 10 },
  avatarEditButton: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingShell: { alignItems: 'center', justifyContent: 'center', minHeight: 120 },
  profileHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  profileIdentity: { flexDirection: 'row', gap: 14, flex: 1 },
  headerText: { flex: 1 },
  role: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  name: { fontFamily: Fonts.rounded, fontSize: 28, fontWeight: '700', marginTop: 4 },
  meta: { fontFamily: Fonts.sans, fontSize: 14, marginTop: 6 },
  inlineInput: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: Fonts.sans,
    fontSize: 14,
    marginTop: 6,
  },
  editFields: { gap: 10, marginTop: 6 },
  bioInput: {
    borderRadius: 16,
    minHeight: 96,
    paddingHorizontal: 12,
    paddingVertical: 12,
    textAlignVertical: 'top',
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 21,
  },
  reputationBadge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  reputationBadgeText: { fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  bio: { fontFamily: Fonts.sans, fontSize: 15, lineHeight: 22, marginTop: 6 },
  reputation: { fontFamily: Fonts.rounded, fontSize: 14, fontWeight: '700', marginTop: 2 },
  profileActions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 4 },
  primaryAction: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 11 },
  primaryActionText: { color: '#ffffff', fontFamily: Fonts.rounded, fontSize: 13, fontWeight: '700' },
  secondaryAction: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 11 },
  secondaryActionText: { fontFamily: Fonts.rounded, fontSize: 13, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  roleCard: { borderRadius: 24, borderWidth: 1, padding: 18, gap: 12 },
  roleCardTitle: { fontFamily: Fonts.rounded, fontSize: 18, fontWeight: '700' },
  roleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  roleDot: { width: 10, height: 10, borderRadius: 999, marginTop: 6 },
  roleCopy: { flex: 1, fontFamily: Fonts.sans, fontSize: 14, lineHeight: 21 },
  notificationsCard: { borderRadius: 24, borderWidth: 1, padding: 18, gap: 12 },
  notificationsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  notificationsTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1 },
  notificationsTitle: { fontFamily: Fonts.rounded, fontSize: 18, fontWeight: '700' },
  unreadBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  unreadBadgeText: { fontFamily: Fonts.rounded, fontSize: 11, fontWeight: '700' },
  markAllButton: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9 },
  markAllButtonText: { fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '700' },
  notificationCard: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 10 },
  notificationTopRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  notificationIdentity: { flexDirection: 'row', gap: 10, flex: 1 },
  notificationIconWrap: { width: 34, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  notificationTextWrap: { flex: 1 },
  notificationHeading: { fontFamily: Fonts.rounded, fontSize: 14, fontWeight: '700' },
  notificationMeta: { fontFamily: Fonts.sans, fontSize: 12, marginTop: 3 },
  notificationBody: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 20 },
  notificationDot: { width: 10, height: 10, borderRadius: 999, marginTop: 6 },
  notificationActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  notificationTypePill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  notificationTypeText: { fontFamily: Fonts.rounded, fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  readButton: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  readButtonText: { fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '700' },
  emptyNotifications: { borderRadius: 18, padding: 16, gap: 10, alignItems: 'flex-start' },
  emptyNotificationsText: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 20 },
  logoutButton: { borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
  logoutButtonText: { color: '#ffffff', fontFamily: Fonts.rounded, fontSize: 15, fontWeight: '700' },
});
