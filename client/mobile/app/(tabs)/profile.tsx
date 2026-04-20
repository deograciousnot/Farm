import Feather from '@expo/vector-icons/Feather';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ProfileView } from '@/components/profile-view';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { api } from '@/lib/api';
import type { NotificationItem, ProfileResponse, UploadableAsset } from '@/lib/types';
import { useSession } from '@/providers/session-provider';

export default function ProfileScreen() {
  const params = useLocalSearchParams<{ tab?: string; edit?: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { token, isLoading: isSessionLoading, updateUser } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'listings' | 'followers' | 'following'>('posts');
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
  const [processingPostId, setProcessingPostId] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.getProfile(token);
      setProfileData(response);
      setDraftName(response.profile.name ?? '');
      setDraftLocation(response.profile.location ?? '');
      setDraftBio(response.profile.bio ?? '');
      setDraftPhone(response.profile.phone ?? '');
      setDraftInterests((response.profile.interests ?? []).join(', '));
    } catch (error) {
      console.warn('Failed to load profile.', error);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile])
  );

  const showLoading = isSessionLoading || isLoading;
  const unreadCount = profileData?.notificationMeta.unreadCount ?? 0;

  useEffect(() => {
    if (params.tab === 'posts' || params.tab === 'listings' || params.tab === 'followers' || params.tab === 'following') {
      setActiveTab(params.tab);
    }
  }, [params.tab]);

  useEffect(() => {
    if (params.edit === '1' && profileData) {
      setIsEditing(true);
    }
  }, [params.edit, profileData]);

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

    return `${Math.floor(diffHours / 24)}d ago`;
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
      await loadProfile();
    } catch (error) {
      Alert.alert('Profile update failed', error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeletePost(postId: string) {
    if (!token) {
      return;
    }

    Alert.alert('Delete post?', 'This will remove the post from your profile and feed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setProcessingPostId(postId);

            try {
              await api.deleteFeedPost(token, postId);
              setProfileData((current) =>
                current
                  ? {
                      ...current,
                      posts: current.posts.filter((post) => post._id !== postId),
                      metrics: {
                        ...current.metrics,
                        posts: Math.max(0, current.metrics.posts - 1),
                      },
                    }
                  : current
              );
            } catch (error) {
              Alert.alert('Delete failed', error instanceof Error ? error.message : 'Something went wrong.');
            } finally {
              setProcessingPostId(null);
            }
          })();
        },
      },
    ]);
  }

  async function handleMarkNotificationRead(notificationId: string) {
    if (!token) {
      return;
    }

    setActiveNotificationId(notificationId);

    try {
      const response = await api.markNotificationRead(token, notificationId);
      setProfileData((current) =>
        current
          ? {
              ...current,
              notificationMeta: { unreadCount: response.unreadCount },
              notifications: current.notifications.map((item) =>
                item._id === notificationId ? { ...item, isRead: true } : item
              ),
            }
          : current
      );
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
              notificationMeta: { unreadCount: response.unreadCount },
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

  if (!token) {
    return (
      <ScrollView style={[styles.screen, { backgroundColor: palette.background }]} contentContainerStyle={styles.content}>
        <View style={styles.guestShell}>
          <Text style={[styles.eyebrow, { color: palette.tint }]}>Guest mode</Text>
          <Text style={[styles.guestTitle, { color: palette.text }]}>Sign in to build your FarmConnect profile.</Text>
          <Text style={[styles.guestCopy, { color: palette.muted }]}>
            Your posts, listings, followers, and notifications will all live here once you sign in.
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={[styles.screen, { backgroundColor: palette.background }]} contentContainerStyle={styles.content}>
      {showLoading || !profileData ? (
        <View style={styles.loadingShell}>
          <ActivityIndicator color={palette.tint} />
        </View>
      ) : isEditing ? (
        <View style={[styles.editShell, { backgroundColor: palette.backgroundSecondary }]}>
          <View style={styles.editHeader}>
            <View>
              <Text style={[styles.eyebrow, { color: palette.tint }]}>Profile editor</Text>
              <Text style={[styles.editTitle, { color: palette.text }]}>Refine your public profile</Text>
            </View>
            <Pressable onPress={() => setIsEditing(false)} style={[styles.closeButton, { backgroundColor: palette.surface }]}>
              <Feather name="x" size={18} color={palette.text} />
            </Pressable>
          </View>

          <Pressable onPress={pickAvatar} style={styles.avatarPicker}>
            <Text style={[styles.avatarPickerLabel, { color: palette.text }]}>Update photo</Text>
            <Text style={[styles.avatarPickerHint, { color: palette.muted }]}>
              {draftAvatar ? 'New photo selected' : 'Tap to choose a new profile picture'}
            </Text>
          </Pressable>

          <TextInput value={draftName} onChangeText={setDraftName} placeholder="Name" placeholderTextColor={palette.muted} style={[styles.input, { color: palette.text, backgroundColor: palette.surface }]} />
          <TextInput value={draftLocation} onChangeText={setDraftLocation} placeholder="Location" placeholderTextColor={palette.muted} style={[styles.input, { color: palette.text, backgroundColor: palette.surface }]} />
          <TextInput value={draftBio} onChangeText={setDraftBio} placeholder="Bio" placeholderTextColor={palette.muted} multiline style={[styles.bioInput, { color: palette.text, backgroundColor: palette.surface }]} />
          <TextInput value={draftPhone} onChangeText={setDraftPhone} placeholder="Phone" placeholderTextColor={palette.muted} style={[styles.input, { color: palette.text, backgroundColor: palette.surface }]} />
          <TextInput value={draftInterests} onChangeText={setDraftInterests} placeholder="Interests separated by commas" placeholderTextColor={palette.muted} style={[styles.input, { color: palette.text, backgroundColor: palette.surface }]} />

          <View style={styles.editActions}>
            <Pressable onPress={() => setIsEditing(false)} style={[styles.secondaryAction, { backgroundColor: palette.surface }]}>
              <Text style={[styles.secondaryActionText, { color: palette.text }]}>Cancel</Text>
            </Pressable>
            <Pressable onPress={() => void handleSaveProfile()} style={[styles.primaryAction, { backgroundColor: palette.tint }]}>
              <Text style={styles.primaryActionText}>{isSaving ? 'Saving...' : 'Save profile'}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <ProfileView
          palette={palette}
          profileData={profileData}
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          onEditProfile={() => setIsEditing(true)}
          onShareProfile={() => Alert.alert('Share profile', 'Profile sharing UI can be connected next.')}
          onLogoutMenu={() => router.push('/settings')}
          onDeletePost={handleDeletePost}
          processingPostId={processingPostId}
          showNotifications
          notificationsSlot={
            <View style={styles.notificationsSection}>
              <View style={styles.notificationsHeader}>
                <View style={styles.notificationsTitleRow}>
                  <Text style={[styles.sectionTitle, { color: palette.text }]}>Recent notifications</Text>
                  {unreadCount ? (
                    <View style={[styles.unreadBadge, { backgroundColor: `${palette.accent}18` }]}>
                      <Text style={[styles.unreadBadgeText, { color: palette.accent }]}>{unreadCount} new</Text>
                    </View>
                  ) : null}
                </View>
                <Pressable
                  onPress={() => void handleMarkAllRead()}
                  disabled={!unreadCount || isMarkingAllRead}
                  style={[styles.inlineActionButton, { backgroundColor: unreadCount ? palette.surface : palette.backgroundSecondary }]}>
                  <Text style={[styles.inlineActionText, { color: unreadCount ? palette.text : palette.muted }]}>
                    {isMarkingAllRead ? 'Updating...' : 'Mark all read'}
                  </Text>
                </Pressable>
              </View>

              {profileData.notifications.length ? (
                profileData.notifications.map((item) => {
                  const notificationTheme = getNotificationTheme(item);

                  return (
                    <View key={item._id} style={[styles.notificationRow, { borderBottomColor: palette.border }]}>
                      <View style={styles.notificationTop}>
                        <View style={[styles.notificationIconWrap, { backgroundColor: `${notificationTheme.tint}16` }]}>
                          <Feather name={notificationTheme.icon as never} size={15} color={notificationTheme.tint} />
                        </View>
                        <View style={styles.notificationTextWrap}>
                          <View style={styles.notificationHeadingRow}>
                            <Text style={[styles.notificationHeading, { color: palette.text }]}>{item.title}</Text>
                            {!item.isRead ? <View style={[styles.notificationDot, { backgroundColor: notificationTheme.tint }]} /> : null}
                          </View>
                          <Text style={[styles.notificationBody, { color: palette.muted }]}>{item.body}</Text>
                          <View style={styles.notificationMetaRow}>
                            <Text style={[styles.notificationMeta, { color: palette.muted }]}>{formatRelativeTime(item.createdAt)}</Text>
                            <Text style={[styles.notificationMeta, { color: notificationTheme.tint }]}>{item.type}</Text>
                          </View>
                        </View>
                      </View>
                      {!item.isRead ? (
                        <Pressable
                          onPress={() => void handleMarkNotificationRead(item._id)}
                          disabled={activeNotificationId === item._id}
                          style={[styles.markReadButton, { backgroundColor: palette.surface }]}>
                          <Text style={[styles.markReadText, { color: palette.text }]}>
                            {activeNotificationId === item._id ? 'Saving...' : 'Mark read'}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })
              ) : (
                <View style={[styles.emptyNotifications, { backgroundColor: palette.surface }]}>
                  <Feather name="bell-off" size={18} color={palette.muted} />
                  <Text style={[styles.emptyNotificationsText, { color: palette.muted }]}>
                    No notifications yet. Likes, replies, comments, and orders will show up here.
                  </Text>
                </View>
              )}
            </View>
          }
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 18, gap: 18, paddingBottom: 36 },
  loadingShell: { minHeight: 180, alignItems: 'center', justifyContent: 'center' },
  guestShell: { gap: 8, paddingTop: 8 },
  eyebrow: { fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.1 },
  guestTitle: { fontFamily: Fonts.rounded, fontSize: 30, fontWeight: '700', lineHeight: 36 },
  guestCopy: { fontFamily: Fonts.sans, fontSize: 15, lineHeight: 22 },
  editShell: { borderRadius: 30, padding: 18, gap: 12 },
  editHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  editTitle: { fontFamily: Fonts.rounded, fontSize: 24, fontWeight: '700', lineHeight: 30 },
  closeButton: { width: 38, height: 38, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  avatarPicker: { borderRadius: 18, padding: 14 },
  avatarPickerLabel: { fontFamily: Fonts.rounded, fontSize: 15, fontWeight: '700' },
  avatarPickerHint: { fontFamily: Fonts.sans, fontSize: 13, marginTop: 4 },
  input: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, fontFamily: Fonts.sans, fontSize: 14 },
  bioInput: { borderRadius: 18, minHeight: 110, paddingHorizontal: 14, paddingVertical: 14, textAlignVertical: 'top', fontFamily: Fonts.sans, fontSize: 14, lineHeight: 21 },
  editActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  secondaryAction: { flex: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingVertical: 13 },
  secondaryActionText: { fontFamily: Fonts.rounded, fontSize: 13, fontWeight: '700' },
  primaryAction: { flex: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingVertical: 13 },
  primaryActionText: { color: '#ffffff', fontFamily: Fonts.rounded, fontSize: 13, fontWeight: '700' },
  sectionTitle: { fontFamily: Fonts.rounded, fontSize: 18, fontWeight: '700' },
  notificationsSection: { gap: 10 },
  notificationsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  notificationsTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1 },
  unreadBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  unreadBadgeText: { fontFamily: Fonts.rounded, fontSize: 11, fontWeight: '700' },
  inlineActionButton: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9 },
  inlineActionText: { fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '700' },
  notificationRow: { gap: 10, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  notificationTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  notificationIconWrap: { width: 34, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  notificationTextWrap: { flex: 1, gap: 4 },
  notificationHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  notificationHeading: { fontFamily: Fonts.rounded, fontSize: 14, fontWeight: '700' },
  notificationBody: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 20 },
  notificationMetaRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  notificationMeta: { fontFamily: Fonts.sans, fontSize: 12, textTransform: 'capitalize' },
  notificationDot: { width: 8, height: 8, borderRadius: 999 },
  markReadButton: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  markReadText: { fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '700' },
  emptyNotifications: { borderRadius: 18, padding: 16, gap: 10, alignItems: 'flex-start' },
  emptyNotificationsText: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 20 },
});
