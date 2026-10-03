import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { IconButton } from '@/components/ui/icon-button';
import { ListRow } from '@/components/ui/list-row';
import { MessageComposer } from '@/components/ui/message-composer';
import { MoreButton } from '@/components/ui/more-button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Section } from '@/components/ui/section';
import { ListSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/state-views';
import { Radius, ScreenPadding, Spacing } from '@/constants/theme';
import { queryKeys, useThread, useThreadReplies } from '@/hooks/queries';
import { useReportContent, useRequireSignIn } from '@/hooks/use-content-actions';
import { useTheme } from '@/hooks/use-theme';
import { api, getErrorMessage } from '@/lib/api';
import type { CommunityThread, ThreadReply } from '@/lib/types';
import { useSession } from '@/providers/session-provider';
import { useToast } from '@/providers/toast-provider';
import { formatRelativeTime, pluralize } from '@/utils/format';
import { describeUser, openProfile } from '@/utils/user';

export default function CommunityThreadScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const thread = useThread(id);
  const reportContent = useReportContent();

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader
        title="Discussion"
        right={
          thread.data ? (
            <IconButton
              icon="flag"
              label="Report discussion"
              onPress={() => reportContent({ targetType: 'thread', targetId: thread.data._id, label: 'discussion', note: thread.data.title })}
            />
          ) : null
        }
      />
      {thread.isPending ? (
        <View style={styles.content}>
          <ListSkeleton count={2} />
        </View>
      ) : thread.isError ? (
        <ErrorState error={thread.error} onRetry={() => void thread.refetch()} retrying={thread.isFetching} />
      ) : !thread.data ? (
        <EmptyState icon="message-circle" title="Discussion not found" body="It may have been removed." />
      ) : (
        <ThreadBody thread={thread.data} />
      )}
    </KeyboardAvoidingView>
  );
}

function ThreadBody({ thread }: { thread: CommunityThread }) {
  const replies = useThreadReplies(thread._id);
  const reportContent = useReportContent();

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.question}>
          <View style={styles.badges}>
            <Badge label={thread.category} tone="primary" />
            {thread.isPinned ? <Badge label="Pinned" tone="accent" icon="bookmark" /> : null}
          </View>
          <AppText variant="title">{thread.title}</AppText>
          <AppText variant="body">{thread.body}</AppText>
          {thread.media?.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.media}>
              {thread.media.map((item, index) => (
                <Image key={`${item.url}-${index}`} source={{ uri: item.thumbnailUrl || item.url }} contentFit="cover" transition={150} style={styles.mediaImage} />
              ))}
            </ScrollView>
          ) : null}
          <AppText variant="caption" color="textMuted">
            {pluralize(thread.viewsCount, 'view')} · asked {formatRelativeTime(thread.createdAt)}
          </AppText>
        </View>

        <Card padded={false} style={styles.authorCard}>
          <ListRow
            avatar={{ name: thread.author.name, imageUrl: thread.author.avatarUrl }}
            title={thread.author.name}
            subtitle={`Asked by · ${describeUser(thread.author)}`}
            onPress={() => openProfile(thread.author)}
          />
        </Card>

        <Section title={pluralize(replies.data?.length ?? thread.repliesCount, 'answer')}>
          {replies.isPending ? (
            <ListSkeleton count={2} />
          ) : replies.isError ? (
            <ErrorState error={replies.error} onRetry={() => void replies.refetch()} retrying={replies.isFetching} />
          ) : replies.data.length ? (
            replies.data.map((reply) => (
              <ReplyItem
                key={reply._id}
                reply={reply}
                onReport={() => reportContent({ targetType: 'reply', targetId: reply._id, label: 'answer', note: reply.body.slice(0, 180) })}
              />
            ))
          ) : (
            <EmptyState icon="message-circle" title="No answers yet" body="If you've dealt with this before, your experience could save someone's harvest." />
          )}
        </Section>
      </ScrollView>
      <ReplyComposer threadId={thread._id} />
    </>
  );
}

function ReplyItem({ reply, onReport }: { reply: ThreadReply; onReport: () => void }) {
  return (
    <Card>
      <View style={styles.replyHeader}>
        <Pressable accessibilityRole="button" onPress={() => openProfile(reply.author)} style={styles.replyAuthor}>
          <Avatar name={reply.author.name} imageUrl={reply.author.avatarUrl} size={32} />
          <View style={styles.flex}>
            <AppText variant="label" numberOfLines={1}>
              {reply.author.name}
            </AppText>
            <AppText variant="caption" color="textMuted" numberOfLines={1}>
              {describeUser(reply.author, formatRelativeTime(reply.createdAt))}
            </AppText>
          </View>
        </Pressable>
        <MoreButton label="Report answer" onPress={onReport} />
      </View>
      <AppText variant="callout">{reply.body}</AppText>
    </Card>
  );
}

function ReplyComposer({ threadId }: { threadId: string }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { token } = useSession();
  const requireSignIn = useRequireSignIn();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  async function send(body: string) {
    const authToken = requireSignIn('Sign in to answer and help other farmers.');

    if (!authToken) {
      return false;
    }

    try {
      const response = await api.createThreadReply(authToken, threadId, body);
      queryClient.setQueryData<ThreadReply[]>(queryKeys.threadReplies(threadId), (current) => [response.item, ...(current ?? [])]);
      queryClient.setQueryData<CommunityThread>(queryKeys.thread(threadId), (current) =>
        current ? { ...current, repliesCount: response.repliesCount } : current
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.community });
      showToast('Answer posted');
      return true;
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
      return false;
    }
  }

  return (
    <View
      style={[
        styles.composerBar,
        { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, Spacing.sm) },
      ]}>
      <MessageComposer
        placeholder="Share what worked for you…"
        guestLabel={token ? undefined : 'Sign in to answer'}
        onGuestPress={() => requireSignIn('Sign in to answer and help other farmers.')}
        onSend={send}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingHorizontal: ScreenPadding, paddingTop: Spacing.xs, paddingBottom: Spacing.xl, gap: Spacing.lg },
  question: { gap: Spacing.sm },
  badges: { flexDirection: 'row', gap: 6 },
  media: { gap: Spacing.xs },
  mediaImage: { width: 220, height: 165, borderRadius: Radius.lg },
  authorCard: { paddingHorizontal: Spacing.sm },
  replyHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  replyAuthor: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  composerBar: {
    paddingHorizontal: ScreenPadding,
    paddingTop: Spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
