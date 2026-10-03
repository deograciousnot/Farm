import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ProfileView } from '@/components/profile/profile-view';
import { IconButton } from '@/components/ui/icon-button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ListSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/state-views';
import { ScreenPadding, Spacing } from '@/constants/theme';
import { queryKeys, usePublicProfile } from '@/hooks/queries';
import { useReportContent, useRequireSignIn } from '@/hooks/use-content-actions';
import { api, getErrorMessage } from '@/lib/api';
import type { ProfileResponse } from '@/lib/types';
import { useToast } from '@/providers/toast-provider';

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const profile = usePublicProfile(id);
  const requireSignIn = useRequireSignIn();
  const reportContent = useReportContent();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [isFollowPending, setIsFollowPending] = useState(false);

  async function toggleFollow() {
    const token = requireSignIn('Sign in to follow farmers and see their updates.');

    if (!token || !id) {
      return;
    }

    setIsFollowPending(true);

    try {
      const response = await api.toggleFollow(token, id);
      queryClient.setQueryData<ProfileResponse>(queryKeys.profile(id), (data) =>
        data
          ? {
              ...data,
              profile: { ...data.profile, followersCount: response.followersCount },
              socialGraph: { ...data.socialGraph, isFollowing: response.following },
            }
          : data
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.feedRoot });
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
    } finally {
      setIsFollowPending(false);
    }
  }

  const isOwner = profile.data?.socialGraph.isOwner;

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={profile.data?.profile.name ?? 'Profile'}
        right={
          profile.data && !isOwner && id ? (
            <IconButton icon="flag" label="Report profile" onPress={() => reportContent({ targetType: 'user', targetId: id, label: 'profile' })} />
          ) : null
        }
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {profile.isPending ? (
          <ListSkeleton count={2} />
        ) : profile.isError ? (
          <ErrorState error={profile.error} onRetry={() => void profile.refetch()} retrying={profile.isFetching} />
        ) : !profile.data ? (
          <EmptyState icon="user-x" title="Profile not found" />
        ) : (
          <ProfileView data={profile.data} onToggleFollow={() => void toggleFollow()} isFollowPending={isFollowPending} />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: ScreenPadding, paddingTop: Spacing.xs, paddingBottom: Spacing.xxl },
});
