import { useQueryClient } from '@tanstack/react-query';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/ui/avatar';
import { MessageComposer } from '@/components/ui/message-composer';
import { Sheet } from '@/components/ui/sheet';
import { ListSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/state-views';
import { Spacing } from '@/constants/theme';
import { patchPostInCache, queryKeys, useComments } from '@/hooks/queries';
import { useRequireSignIn } from '@/hooks/use-content-actions';
import { api, getErrorMessage } from '@/lib/api';
import type { Comment, FeedPost } from '@/lib/types';
import { useSession } from '@/providers/session-provider';
import { useToast } from '@/providers/toast-provider';
import { formatRelativeTime } from '@/utils/format';
import { openProfile } from '@/utils/user';

export function CommentItem({ comment }: { comment: Comment }) {
  return (
    <View style={styles.item}>
      <Pressable accessibilityRole="button" accessibilityLabel={`View ${comment.author.name}'s profile`} onPress={() => openProfile(comment.author)}>
        <Avatar name={comment.author.name} imageUrl={comment.author.avatarUrl} size={34} />
      </Pressable>
      <View style={styles.itemBody}>
        <View style={styles.itemHeader}>
          <AppText variant="label" numberOfLines={1} style={styles.itemName}>
            {comment.author.name}
          </AppText>
          <AppText variant="caption" color="textSubtle">
            {formatRelativeTime(comment.createdAt)}
          </AppText>
        </View>
        <AppText variant="callout">{comment.body}</AppText>
      </View>
    </View>
  );
}

export function CommentComposer({ postId, placeholder = 'Add a helpful comment…' }: { postId: string; placeholder?: string }) {
  const { token } = useSession();
  const requireSignIn = useRequireSignIn();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  async function send(body: string) {
    const authToken = requireSignIn('Sign in to join the conversation.');

    if (!authToken) {
      return false;
    }

    try {
      const response = await api.createComment(authToken, postId, body);
      queryClient.setQueryData<Comment[]>(queryKeys.comments(postId), (current) => [response.item, ...(current ?? [])]);
      patchPostInCache(queryClient, postId, (post) => ({
        ...post,
        commentsCount: response.commentsCount,
        recentComments: [response.item, ...post.recentComments].slice(0, 2),
      }));
      return true;
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
      return false;
    }
  }

  return (
    <MessageComposer
      placeholder={placeholder}
      guestLabel={token ? undefined : 'Sign in to comment'}
      onGuestPress={() => requireSignIn('Sign in to join the conversation.')}
      onSend={send}
    />
  );
}

export function CommentList({ postId }: { postId: string }) {
  const comments = useComments(postId);

  if (comments.isPending) {
    return <ListSkeleton count={2} />;
  }

  if (comments.isError) {
    return <ErrorState error={comments.error} onRetry={() => void comments.refetch()} retrying={comments.isFetching} />;
  }

  if (!comments.data.length) {
    return <EmptyState icon="message-circle" title="No comments yet" body="Ask a follow-up or share what worked for you." />;
  }

  return (
    <View style={styles.list}>
      {comments.data.map((comment) => (
        <CommentItem key={comment._id} comment={comment} />
      ))}
    </View>
  );
}

export function CommentSheet({ post, onClose }: { post: FeedPost | null; onClose: () => void }) {
  return (
    <Sheet visible={Boolean(post)} onClose={onClose} title="Comments" subtitle={post?.headline} tall>
      {post ? (
        <>
          <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
            <CommentList postId={post._id} />
          </ScrollView>
          <CommentComposer postId={post._id} />
        </>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.md },
  item: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  itemBody: { flex: 1, gap: 2 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  itemName: { flexShrink: 1 },
  sheetScroll: { flex: 1 },
  sheetContent: { paddingBottom: Spacing.md },
});
