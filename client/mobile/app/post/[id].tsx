import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CommentComposer, CommentList } from '@/components/feed/comments';
import { getPostMedia } from '@/components/feed/feed-post-card';
import { LinkedListingCard } from '@/components/feed/linked-listing-card';
import { PostAuthorRow } from '@/components/feed/post-author-row';
import { FeedMedia } from '@/components/feed/feed-media';
import { AppText } from '@/components/ui/app-text';
import { Badge } from '@/components/ui/badge';
import { IconButton } from '@/components/ui/icon-button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Section } from '@/components/ui/section';
import { ListSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/state-views';
import { ScreenPadding, Spacing } from '@/constants/theme';
import { queryKeys, usePost } from '@/hooks/queries';
import { usePostActions, useReportContent } from '@/hooks/use-content-actions';
import { useTheme } from '@/hooks/use-theme';
import { api, getErrorMessage } from '@/lib/api';
import type { FeedPost } from '@/lib/types';
import { useSession } from '@/providers/session-provider';
import { useToast } from '@/providers/toast-provider';
import { formatRelativeTime } from '@/utils/format';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const post = usePost(id);
  const reportContent = useReportContent();
  const { token } = useSession();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  function confirmDelete(target: FeedPost) {
    Alert.alert('Delete this post?', 'It will be removed from the feed and your profile.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!token) {
            return;
          }

          setIsDeleting(true);

          try {
            await api.deleteFeedPost(token, target._id);
            void queryClient.invalidateQueries({ queryKey: queryKeys.feedRoot });
            void queryClient.invalidateQueries({ queryKey: queryKeys.myProfile });
            showToast('Post deleted');
            router.back();
          } catch (error) {
            showToast(getErrorMessage(error), 'error');
            setIsDeleting(false);
          }
        },
      },
    ]);
  }

  const headerAction = post.data ? (
    post.data.isOwner ? (
      <IconButton icon="trash-2" label="Delete post" color="danger" onPress={() => confirmDelete(post.data)} disabled={isDeleting} />
    ) : (
      <IconButton
        icon="flag"
        label="Report post"
        onPress={() => reportContent({ targetType: 'post', targetId: post.data._id, label: 'post', note: post.data.headline })}
      />
    )
  ) : null;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title="Post" right={headerAction} />
      {post.isPending ? (
        <View style={styles.content}>
          <ListSkeleton count={1} withMedia />
        </View>
      ) : post.isError ? (
        <ErrorState error={post.error} onRetry={() => void post.refetch()} retrying={post.isFetching} />
      ) : !post.data ? (
        <EmptyState icon="file-text" title="Post not found" body="It may have been deleted by its author." />
      ) : (
        <PostBody post={post.data} />
      )}
    </KeyboardAvoidingView>
  );
}

function PostBody({ post }: { post: FeedPost }) {
  const { colors } = useTheme();
  const { toggleLike, toggleSave, toggleFollowAuthor } = usePostActions();
  const blocks = post.bodyBlocks?.length
    ? post.bodyBlocks
    : post.body
        .split(/\n{2,}/)
        .map((text) => text.trim())
        .filter(Boolean)
        .map((text) => ({ type: 'paragraph' as const, text }));
  const hasInlineMedia = blocks.some((block) => block.type !== 'paragraph');
  const media = getPostMedia(post);

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <PostAuthorRow post={post} meta={formatRelativeTime(post.createdAt)} onToggleFollow={() => void toggleFollowAuthor(post)} />

      <View style={styles.article}>
        {post.tag ? <Badge label={post.tag} tone="primary" /> : null}
        <AppText variant="title">{post.headline}</AppText>
        {blocks.map((block, index) =>
          block.type === 'paragraph' ? (
            <AppText key={`p-${index}`} variant="body">
              {block.text}
            </AppText>
          ) : (
            <FeedMedia key={`m-${index}`} media={[block]} mode="detail" />
          )
        )}
        {!hasInlineMedia && media.length ? <FeedMedia media={media} mode="detail" /> : null}
      </View>

      {post.linkedProduct ? <LinkedListingCard product={post.linkedProduct} /> : null}

      <View style={[styles.actions, { borderColor: colors.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={post.hasLiked ? 'Unlike' : 'Like'} onPress={() => void toggleLike(post)} style={styles.action}>
          <Ionicons name={post.hasLiked ? 'heart' : 'heart-outline'} size={22} color={post.hasLiked ? colors.like : colors.textMuted} />
          <AppText variant="label" style={{ color: post.hasLiked ? colors.like : colors.textMuted }}>
            {post.likesCount} {post.likesCount === 1 ? 'like' : 'likes'}
          </AppText>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={post.hasSaved ? 'Remove from saved' : 'Save'} onPress={() => void toggleSave(post)} style={styles.action}>
          <Ionicons name={post.hasSaved ? 'bookmark' : 'bookmark-outline'} size={20} color={post.hasSaved ? colors.primary : colors.textMuted} />
          <AppText variant="label" color={post.hasSaved ? 'primary' : 'textMuted'}>
            {post.hasSaved ? 'Saved' : 'Save'}
          </AppText>
        </Pressable>
      </View>

      <Section title={`Comments · ${post.commentsCount}`}>
        <CommentComposer postId={post._id} placeholder="Ask a follow-up or share what worked for you…" />
        <CommentList postId={post._id} />
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: ScreenPadding, paddingTop: Spacing.xs, paddingBottom: Spacing.xxl, gap: Spacing.lg },
  article: { gap: Spacing.sm },
  actions: {
    flexDirection: 'row',
    gap: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36 },
});
