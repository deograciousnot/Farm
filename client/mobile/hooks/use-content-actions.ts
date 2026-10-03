import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { Alert } from 'react-native';

import { patchPostInCache, queryKeys } from '@/hooks/queries';
import { api, getErrorMessage } from '@/lib/api';
import type { FeedPost } from '@/lib/types';
import { useSession } from '@/providers/session-provider';
import { useToast } from '@/providers/toast-provider';
import { getUserId } from '@/utils/user';

/** Returns a token, or prompts the guest to sign in and returns null. */
export function useRequireSignIn() {
  const { token } = useSession();

  return useCallback(
    (reason: string) => {
      if (token) {
        return token;
      }

      Alert.alert('Sign in to continue', reason, [
        { text: 'Not now', style: 'cancel' },
        { text: 'Sign in', onPress: () => router.push('/auth?mode=login') },
      ]);
      return null;
    },
    [token]
  );
}

type ReportTarget = {
  targetType: 'post' | 'comment' | 'thread' | 'reply' | 'product' | 'user';
  targetId: string;
  /** Shown to the user, e.g. "post" or "reply". */
  label: string;
  note?: string;
};

export function useReportContent() {
  const requireSignIn = useRequireSignIn();
  const { showToast } = useToast();

  return useCallback(
    (target: ReportTarget) => {
      const token = requireSignIn('Sign in to report content to the moderation team.');

      if (!token) {
        return;
      }

      Alert.alert(`Report this ${target.label}?`, 'FarmConnect moderators will review it.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.reportContent(token, {
                targetType: target.targetType,
                targetId: target.targetId,
                reason: `User reported ${target.label}`,
                note: target.note,
              });
              showToast('Thanks — moderators will review it.');
            } catch (error) {
              showToast(getErrorMessage(error), 'error');
            }
          },
        },
      ]);
    },
    [requireSignIn, showToast]
  );
}

/** Like, save and follow for feed posts, with the cache updated everywhere the post appears. */
export function usePostActions() {
  const queryClient = useQueryClient();
  const requireSignIn = useRequireSignIn();
  const { showToast } = useToast();

  const toggleLike = useCallback(
    async (post: FeedPost) => {
      const token = requireSignIn('Sign in to like posts and help good advice rise.');

      if (!token) {
        return;
      }

      // Optimistic: flip immediately, then reconcile with the server's count.
      patchPostInCache(queryClient, post._id, (current) => ({
        ...current,
        hasLiked: !current.hasLiked,
        likesCount: Math.max(0, current.likesCount + (current.hasLiked ? -1 : 1)),
      }));

      try {
        const response = await api.toggleLike(token, post._id);
        patchPostInCache(queryClient, post._id, (current) => ({
          ...current,
          hasLiked: response.liked,
          likesCount: response.likesCount,
        }));
      } catch (error) {
        patchPostInCache(queryClient, post._id, (current) => ({
          ...current,
          hasLiked: post.hasLiked,
          likesCount: post.likesCount,
        }));
        showToast(getErrorMessage(error), 'error');
      }
    },
    [queryClient, requireSignIn, showToast]
  );

  const toggleSave = useCallback(
    async (post: FeedPost) => {
      const token = requireSignIn('Sign in to save posts for later.');

      if (!token) {
        return;
      }

      patchPostInCache(queryClient, post._id, (current) => ({ ...current, hasSaved: !current.hasSaved }));

      try {
        const response = await api.toggleSave(token, post._id);
        patchPostInCache(queryClient, post._id, (current) => ({
          ...current,
          hasSaved: response.saved,
          savesCount: response.savesCount,
        }));
        showToast(response.saved ? 'Saved' : 'Removed from saved', 'info');
      } catch (error) {
        patchPostInCache(queryClient, post._id, (current) => ({ ...current, hasSaved: post.hasSaved }));
        showToast(getErrorMessage(error), 'error');
      }
    },
    [queryClient, requireSignIn, showToast]
  );

  const toggleFollowAuthor = useCallback(
    async (post: FeedPost) => {
      const token = requireSignIn('Sign in to follow farmers and get their updates.');
      const authorId = getUserId(post.author);

      if (!token || !authorId) {
        return;
      }

      try {
        const response = await api.toggleFollow(token, authorId);
        queryClient.setQueriesData<{ pages: { posts: FeedPost[] }[] }>({ queryKey: queryKeys.feedRoot }, (data) =>
          data
            ? {
                ...data,
                pages: data.pages.map((page) => ({
                  ...page,
                  posts: page.posts.map((item) =>
                    getUserId(item.author) === authorId
                      ? {
                          ...item,
                          isFollowingAuthor: response.following,
                          author: { ...item.author, followersCount: response.followersCount },
                        }
                      : item
                  ),
                })),
              }
            : data
        );
        patchPostInCache(queryClient, post._id, (current) => ({
          ...current,
          isFollowingAuthor: response.following,
          author: { ...current.author, followersCount: response.followersCount },
        }));
        // The Following filter is now out of date.
        void queryClient.invalidateQueries({ queryKey: queryKeys.feed('Following') });
        void queryClient.invalidateQueries({ queryKey: queryKeys.profile(authorId) });
        showToast(response.following ? `Following ${post.author.name}` : `Unfollowed ${post.author.name}`, 'info');
      } catch (error) {
        showToast(getErrorMessage(error), 'error');
      }
    },
    [queryClient, requireSignIn, showToast]
  );

  return { toggleLike, toggleSave, toggleFollowAuthor };
}
