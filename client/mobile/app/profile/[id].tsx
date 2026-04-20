import Feather from '@expo/vector-icons/Feather';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProfileView } from '@/components/profile-view';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { api } from '@/lib/api';
import type { ProfileResponse } from '@/lib/types';
import { useSession } from '@/providers/session-provider';

export default function PublicProfileScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { token } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingFollow, setIsProcessingFollow] = useState(false);
  const [processingPostId, setProcessingPostId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'listings' | 'followers' | 'following'>('posts');
  const [profileData, setProfileData] = useState<ProfileResponse | null>(null);

  const loadProfile = useCallback(async () => {
    if (!params.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.getPublicProfile(params.id, token);
      setProfileData(response);
    } catch (error) {
      console.warn('Failed to load public profile.', error);
    } finally {
      setIsLoading(false);
    }
  }, [params.id, token]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile])
  );

  async function handleToggleFollow() {
    if (!token || !params.id || !profileData) {
      return;
    }

    setIsProcessingFollow(true);

    try {
      const response = await api.toggleFollow(token, params.id);
      setProfileData((current) =>
        current
          ? {
              ...current,
              profile: {
                ...current.profile,
                followersCount: response.followersCount,
              },
              socialGraph: {
                ...current.socialGraph,
                isFollowing: response.following,
              },
            }
          : current
      );
    } catch (error) {
      Alert.alert('Follow failed', error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setIsProcessingFollow(false);
    }
  }

  async function handleDeletePost(postId: string) {
    if (!token) {
      return;
    }

    Alert.alert('Delete post?', 'This will remove the post from the profile and feed.', [
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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={[styles.iconButton, { backgroundColor: palette.surface }]}>
            <Feather name="arrow-left" size={18} color={palette.text} />
          </Pressable>
          <Text style={[styles.topBarTitle, { color: palette.text }]}>Profile</Text>
          <View style={styles.spacer} />
        </View>

        {isLoading ? (
          <View style={styles.loadingShell}>
            <ActivityIndicator color={palette.tint} />
          </View>
        ) : profileData ? (
          <ProfileView
            palette={palette}
            profileData={profileData}
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            onShareProfile={() => Alert.alert('Share profile', 'Profile sharing UI can be connected next.')}
            onToggleFollow={() => void handleToggleFollow()}
            onDeletePost={profileData.socialGraph.isOwner ? handleDeletePost : undefined}
            processingPostId={processingPostId}
            processingFollow={isProcessingFollow}
          />
        ) : (
          <View style={styles.loadingShell}>
            <Text style={[styles.emptyText, { color: palette.muted }]}>Profile not found.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 18, gap: 16, paddingBottom: 34 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: { width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { fontFamily: Fonts.rounded, fontSize: 18, fontWeight: '700' },
  spacer: { width: 40 },
  loadingShell: { minHeight: 200, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: Fonts.sans, fontSize: 14 },
});
