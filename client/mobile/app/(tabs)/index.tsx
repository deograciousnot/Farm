import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BroadcastCard } from '@/components/broadcasts/broadcast-card';
import { CommentSheet } from '@/components/feed/comments';
import { FeedPostCard } from '@/components/feed/feed-post-card';
import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { ChipGroup } from '@/components/ui/chip';
import { Fab } from '@/components/ui/fab';
import { TabHeader } from '@/components/ui/screen-header';
import { ListSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/state-views';
import { ScreenPadding, Spacing } from '@/constants/theme';
import { useBroadcasts, useCommunity, useFeed, usePullToRefresh, useRefreshOnFocus } from '@/hooks/queries';
import { useDismissBroadcast, usePostActions, useReportContent } from '@/hooks/use-content-actions';
import { useTheme } from '@/hooks/use-theme';
import type { CommunityThread, FeedPost } from '@/lib/types';
import { useSession } from '@/providers/session-provider';
import { pluralize } from '@/utils/format';

function greeting(name?: string) {
  const hour = new Date().getHours();
  const part = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return name ? `${part}, ${name.split(' ')[0]}` : part;
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const [filter, setFilter] = useState('All');
  const [commentPost, setCommentPost] = useState<FeedPost | null>(null);

  const feed = useFeed(filter);
  const community = useCommunity();
  const broadcasts = useBroadcasts('home');
  const dismissBroadcast = useDismissBroadcast();
  const { toggleLike, toggleSave, toggleFollowAuthor } = usePostActions();
  const reportContent = useReportContent();

  useRefreshOnFocus(feed.refetch);
  const { refetch: refetchFeed } = feed;
  const { refetch: refetchCommunity } = community;
  const { refetch: refetchBroadcasts } = broadcasts;
  const { refreshing, onRefresh } = usePullToRefresh(
    useCallback(() => Promise.all([refetchFeed(), refetchCommunity(), refetchBroadcasts()]), [refetchBroadcasts, refetchCommunity, refetchFeed])
  );

  const posts = useMemo(() => feed.data?.pages.flatMap((page) => page.posts) ?? [], [feed.data]);
  const filters = useMemo(() => Array.from(new Set(['All', ...(feed.data?.pages[0]?.interestChips ?? [])])), [feed.data]);
  const featuredThread = useMemo(() => pickFeaturedThread(community.data?.threads ?? []), [community.data]);

  // Keep the open comment sheet in sync with cache updates (e.g. comment counts).
  const activeCommentPost = commentPost ? (posts.find((post) => post._id === commentPost._id) ?? commentPost) : null;

  const reportPost = useCallback(
    (post: FeedPost) => reportContent({ targetType: 'post', targetId: post._id, label: 'post', note: post.headline }),
    [reportContent]
  );

  const header = (
    <View style={styles.header}>
      <TabHeader title={greeting(user?.name)} subtitle="What farmers are sharing today" />
      <ChipGroup options={filters} value={filter} onChange={setFilter} bleed />
      {filter === 'All' && broadcasts.data?.length ? (
        <View style={styles.official}>
          <BroadcastCard broadcast={broadcasts.data[0]} onDismiss={dismissBroadcast} />
          {broadcasts.data.length > 1 ? (
            <Pressable accessibilityRole="link" onPress={() => router.push('/broadcasts')} hitSlop={8} style={styles.seeAll}>
              <AppText variant="label" color="primary">
                {broadcasts.data.length - 1} more official {broadcasts.data.length === 2 ? 'update' : 'updates'} →
              </AppText>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {featuredThread && filter === 'All' ? <FeaturedDiscussion thread={featuredThread} /> : null}
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <FeedPostCard
            post={item}
            onToggleLike={toggleLike}
            onToggleSave={toggleSave}
            onToggleFollow={toggleFollowAuthor}
            onOpenComments={setCommentPost}
            onReport={reportPost}
          />
        )}
        ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
        ListHeaderComponent={header}
        ListEmptyComponent={
          feed.isPending ? (
            <ListSkeleton withMedia />
          ) : feed.isError ? (
            <ErrorState error={feed.error} onRetry={() => void feed.refetch()} retrying={feed.isFetching} />
          ) : (
            <EmptyState
              icon="feather"
              title={filter === 'Following' ? 'No posts from people you follow' : 'Nothing here yet'}
              body={
                filter === 'Following'
                  ? 'Follow farmers whose advice you trust and their posts will show up here.'
                  : 'Be the first to share what is happening on your farm.'
              }
              action={{ label: 'Share a field note', onPress: () => router.push('/modal') }}
            />
          )
        }
        ListFooterComponent={
          feed.isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={styles.footerSpinner} /> : null
        }
        onEndReached={() => {
          if (feed.hasNextPage && !feed.isFetchingNextPage) {
            void feed.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}
        showsVerticalScrollIndicator={false}
      />

      <Fab icon="edit-3" label="Post" onPress={() => router.push('/modal')} />
      <CommentSheet post={activeCommentPost} onClose={() => setCommentPost(null)} />
    </View>
  );
}

function pickFeaturedThread(threads: CommunityThread[]) {
  return (
    threads.find((thread) => thread.isPinned) ??
    [...threads].sort((a, b) => b.repliesCount * 3 + b.viewsCount - (a.repliesCount * 3 + a.viewsCount))[0]
  );
}

function FeaturedDiscussion({ thread }: { thread: CommunityThread }) {
  const { colors } = useTheme();

  return (
    <Card tone="primarySoft" onPress={() => router.push({ pathname: '/community/[id]', params: { id: thread._id } })}>
      <View style={styles.featuredTop}>
        <Feather name="message-circle" size={14} color={colors.primary} />
        <AppText variant="overline" color="primary">
          Farmers are discussing
        </AppText>
      </View>
      <AppText variant="subhead" numberOfLines={2}>
        {thread.title}
      </AppText>
      <View style={styles.featuredFooter}>
        <AppText variant="caption" color="textMuted" style={styles.featuredMeta}>
          {thread.category} · {pluralize(thread.repliesCount, 'reply', 'replies')}
        </AppText>
        <AppText variant="label" color="primary">
          Join in →
        </AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: ScreenPadding, paddingBottom: 96 },
  header: { gap: Spacing.md, paddingBottom: Spacing.xxs },
  separator: { height: StyleSheet.hairlineWidth },
  footerSpinner: { paddingVertical: Spacing.lg },
  official: { gap: Spacing.xs },
  seeAll: { alignSelf: 'flex-end' },
  featuredTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  featuredFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  featuredMeta: { flex: 1 },
});
