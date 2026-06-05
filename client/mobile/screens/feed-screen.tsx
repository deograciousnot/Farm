import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { FeedPostCard } from '@/components/feed/feed-post-card';
import { SocialAvatar } from '@/components/social-avatar';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { api } from '@/lib/api';
import type { Comment, FeedPost } from '@/lib/types';
import { useSession } from '@/providers/session-provider';
import { formatRelativeTime } from '@/utils/feed-utils';

export default function FeedScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { token, user, mode } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [feedPage, setFeedPage] = useState(1);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [interestChips, setInterestChips] = useState<string[]>([]);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [commentDraft, setCommentDraft] = useState('');
  const [commentSheetPostId, setCommentSheetPostId] = useState<string | null>(null);
  const [sheetComments, setSheetComments] = useState<Comment[]>([]);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [processingPostId, setProcessingPostId] = useState<string | null>(null);
  const [visiblePostIds, setVisiblePostIds] = useState<string[]>([]);
  const [playbackPositions, setPlaybackPositions] = useState<Record<string, number>>({});
  const [isTuneSheetOpen, setIsTuneSheetOpen] = useState(false);
  const viewabilityConfigRef = useRef({ itemVisiblePercentThreshold: 65, minimumViewTime: 160 });

  const loadFeed = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await api.getFeed(token, activeFilter === 'All' ? undefined : activeFilter, 1);
      setInterestChips(response.interestChips);
      setPosts(response.posts);
      setActiveFilter(response.activeFilter || 'All');
      setFeedPage(response.pagination.page);
      setHasMorePosts(response.pagination.hasMore);
    } catch (error) {
      console.warn('Failed to load FarmConnect feed.', error);
    } finally {
      setIsLoading(false);
    }
  }, [activeFilter, token]);

  const loadMorePosts = useCallback(async () => {
    if (isLoading || isLoadingMore || !hasMorePosts) {
      return;
    }

    setIsLoadingMore(true);

    try {
      const nextPage = feedPage + 1;
      const response = await api.getFeed(token, activeFilter === 'All' ? undefined : activeFilter, nextPage);

      setPosts((current) => {
        const existingIds = new Set(current.map((post) => post._id));
        const nextPosts = response.posts.filter((post) => !existingIds.has(post._id));

        return [...current, ...nextPosts];
      });
      setFeedPage(response.pagination.page);
      setHasMorePosts(response.pagination.hasMore);
    } catch (error) {
      console.warn('Failed to load more FarmConnect feed posts.', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [activeFilter, feedPage, hasMorePosts, isLoading, isLoadingMore, token]);

  useFocusEffect(
    useCallback(() => {
      void loadFeed();
    }, [loadFeed])
  );

  const activePost = commentSheetPostId ? posts.find((post) => post._id === commentSheetPostId) ?? null : null;
  const visiblePostIdsSet = useMemo(() => new Set(visiblePostIds), [visiblePostIds]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: { item: FeedPost | null }[] }) => {
      const nextVisibleIds = viewableItems
        .map((entry) => entry.item?._id)
        .filter((value): value is string => Boolean(value));

      setVisiblePostIds(nextVisibleIds);
    }
  );

  const handleToggleSave = useCallback(
    async (postId: string) => {
      if (!token) {
        return;
      }

      try {
        const response = await api.toggleSave(token, postId);

        setPosts((current) =>
          current.map((post) =>
            post._id === postId ? { ...post, hasSaved: response.saved, savesCount: response.savesCount } : post
          )
        );
      } catch (error) {
        console.warn('Failed to toggle save.', error);
      }
    },
    [token]
  );

  const handleToggleLike = useCallback(
    async (postId: string) => {
      if (!token) {
        return;
      }

      let previousPostsSnapshot: FeedPost[] = [];

      setPosts((current) => {
        previousPostsSnapshot = current;

        return current.map((post) =>
          post._id === postId
            ? {
                ...post,
                hasLiked: !post.hasLiked,
                likesCount: post.hasLiked ? Math.max(0, post.likesCount - 1) : post.likesCount + 1,
              }
            : post
        );
      });

      try {
        const response = await api.toggleLike(token, postId);

        setPosts((current) =>
          current.map((post) =>
            post._id === postId
              ? {
                  ...post,
                  hasLiked: response.liked,
                  likesCount: response.likesCount,
                }
              : post
          )
        );
      } catch (error) {
        setPosts(previousPostsSnapshot);
        console.warn('Failed to toggle like.', error);
      }
    },
    [token]
  );

  const handleToggleFollow = useCallback(
    async (post: FeedPost) => {
      if (!token || !post.canFollowAuthor) {
        return;
      }

      const authorId = post.author._id ?? post.author.id;

      if (!authorId) {
        return;
      }

      setProcessingPostId(post._id);

      try {
        const response = await api.toggleFollow(token, authorId);

        setPosts((current) => {
          const nextPosts = current.map((item) =>
            (item.author._id ?? item.author.id) === authorId
              ? {
                  ...item,
                  isFollowingAuthor: response.following,
                  author: {
                    ...item.author,
                    followersCount: response.followersCount,
                  },
                }
              : item
          );

          return activeFilter === 'Following' && !response.following
            ? nextPosts.filter((item) => (item.author._id ?? item.author.id) !== authorId)
            : nextPosts;
        });
      } catch (error) {
        console.warn('Failed to toggle follow.', error);
      } finally {
        setProcessingPostId(null);
      }
    },
    [activeFilter, token]
  );

  const openPost = useCallback((postId: string) => {
    router.push({ pathname: '/post/[id]', params: { id: postId } });
  }, []);

  const openAuthorProfile = useCallback((post: FeedPost) => {
    const authorId = post.author._id ?? post.author.id;

    if (authorId) {
      router.push({ pathname: '/profile/[id]', params: { id: authorId } });
    }
  }, []);

  const openLinkedProduct = useCallback((productId: string) => {
    router.push({ pathname: '/product/[id]', params: { id: productId } });
  }, []);

  const handleReportPost = useCallback(
    (post: FeedPost) => {
      if (!token) {
        Alert.alert('Sign in required', 'Please sign in before reporting content.');
        return;
      }

      Alert.alert('Report post?', 'Send this post to FarmConnect moderation for review.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.reportContent(token, {
                targetType: 'post',
                targetId: post._id,
                reason: 'User reported post',
                note: post.headline,
              });
              Alert.alert('Report sent', 'Thanks. The moderation team will review this post.');
            } catch (error) {
              Alert.alert('Report failed', error instanceof Error ? error.message : 'Something went wrong.');
            }
          },
        },
      ]);
    },
    [token]
  );

  const handlePlaybackTimeChange = useCallback((mediaUrl: string, currentTime: number) => {
    setPlaybackPositions((current) => {
      if (Math.abs((current[mediaUrl] ?? 0) - currentTime) < 0.2) {
        return current;
      }

      return {
        ...current,
        [mediaUrl]: currentTime,
      };
    });
  }, []);

  const openComments = useCallback(async (post: FeedPost) => {
    setCommentSheetPostId(post._id);
    setCommentDraft('');
    setSheetComments(post.recentComments);
    setIsCommentsLoading(true);

    try {
      const response = await api.getComments(post._id);
      setSheetComments(response.items);
    } catch (error) {
      console.warn('Failed to load comments.', error);
    } finally {
      setIsCommentsLoading(false);
    }
  }, []);

  const closeComments = useCallback(() => {
    setCommentSheetPostId(null);
    setCommentDraft('');
    setSheetComments([]);
  }, []);

  const handleCreateComment = useCallback(async () => {
    if (!token || !activePost) {
      return;
    }

    const body = commentDraft.trim();

    if (!body) {
      return;
    }

    setIsSubmittingComment(true);

    try {
      const response = await api.createComment(token, activePost._id, body);

      setPosts((current) =>
        current.map((post) =>
          post._id === activePost._id
            ? {
                ...post,
                commentsCount: response.commentsCount,
                recentComments: [response.item, ...post.recentComments].slice(0, 2),
              }
            : post
        )
      );
      setSheetComments((current) => [response.item, ...current]);
      setCommentDraft('');
    } catch (error) {
      console.warn('Failed to create comment.', error);
    } finally {
      setIsSubmittingComment(false);
    }
  }, [activePost, commentDraft, token]);

  const filters = useMemo(() => {
    const uniqueFilters = new Set(['All', ...interestChips]);
    return Array.from(uniqueFilters);
  }, [interestChips]);

  const trendDigest = useMemo(() => {
    const topicPost =
      posts.find((post) => /pest|disease|chaos|problem|debate|solution|forum/i.test(`${post.headline} ${post.body}`)) ??
      posts.find((post) => post.tag?.toLowerCase().includes('community')) ??
      posts[0];
    const marketPost =
      posts.find((post) => /egg|tomato|price|prices|market|soar|cost/i.test(`${post.headline} ${post.body}`)) ??
      posts.find((post) => post.tag?.toLowerCase().includes('market'));

    return {
      topicPost,
      marketPost,
    };
  }, [posts]);

  const header = useMemo(
    () => (
      <>
        <Animated.View entering={FadeInDown.duration(300)} style={styles.feedTopBar}>
          <View style={styles.feedTitleWrap}>
            <Text style={[styles.eyebrow, { color: palette.tint }]}>FarmConnect</Text>
            <Text style={[styles.title, { color: palette.text }]}>Feed</Text>
          </View>
        </Animated.View>

        {trendDigest.topicPost ? (
          <Animated.View entering={FadeIn.duration(320)} style={[styles.teaBrief, { backgroundColor: `${palette.tint}0F` }]}>
            <View style={styles.teaBriefHeader}>
              <View style={[styles.teaIcon, { backgroundColor: `${palette.tint}18` }]}>
                <Feather name="trending-up" size={16} color={palette.tint} />
              </View>
              <View style={styles.teaBriefTitleWrap}>
                <Text style={[styles.teaKicker, { color: palette.tint }]}>Latest tea</Text>
                <Text style={[styles.teaTitle, { color: palette.text }]}>What farmers are debating now</Text>
              </View>
            </View>
            <Text style={[styles.teaBody, { color: palette.text }]}>
              FarmConnect noticed a community topic picking up steam around {trendDigest.topicPost.tag?.toLowerCase() || 'farm decisions'}.
              People are comparing what worked, what failed, and which advice is worth trusting before more farmers are affected.
            </Text>
            {trendDigest.marketPost ? (
              <Text style={[styles.teaAside, { color: palette.muted }]}>
                Also trending: {trendDigest.marketPost.headline}
              </Text>
            ) : null}
            <Pressable onPress={() => router.push('/(tabs)/community')} style={styles.teaLink} hitSlop={8}>
              <Text style={[styles.teaLinkText, { color: palette.tint }]}>Open community discussion</Text>
              <Feather name="arrow-right" size={15} color={palette.tint} />
            </Pressable>
          </Animated.View>
        ) : null}

        {user ? (
          <Animated.View entering={FadeIn.duration(300)} style={[styles.accountStrip, { backgroundColor: palette.surface }]}>
            <SocialAvatar name={user.name} imageUrl={user.avatarUrl} size={34} />
            <View style={styles.accountText}>
              <Text style={[styles.accountTitle, { color: palette.text }]}>
                {user.name} <Text style={[styles.accountMeta, { color: palette.muted }]}>| {user.role}</Text>
              </Text>
            </View>
          </Animated.View>
        ) : mode === 'guest' ? (
          <Animated.View entering={FadeIn.duration(300)} style={[styles.accountStrip, { backgroundColor: palette.surface }]}>
            <Text style={[styles.accountTitle, { color: palette.text }]}>Guest mode</Text>
          </Animated.View>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topicRow}>
          {filters.map((chip) => (
            <Pressable
              onPress={() => setActiveFilter(chip)}
              key={chip}
              style={[
                styles.topicChip,
                {
                  backgroundColor: activeFilter === chip ? palette.text : palette.surface,
                  borderColor: activeFilter === chip ? palette.text : palette.border,
                },
              ]}>
              <Text style={[styles.topicChipText, { color: activeFilter === chip ? palette.background : palette.text }]}>
                {chip}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {isLoading ? (
          <View style={styles.loadingShell}>
            <ActivityIndicator color={palette.tint} />
            <Text style={[styles.loadingText, { color: palette.muted }]}>Loading your feed...</Text>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>{activeFilter === 'All' ? 'Latest field notes' : activeFilter}</Text>
        </View>

        {!isLoading && posts.length === 0 ? (
          <View style={styles.emptyFeedState}>
            <Text style={[styles.emptyFeedTitle, { color: palette.text }]}>
              {activeFilter === 'Following' ? 'No followed posts yet' : 'Nothing here yet'}
            </Text>
            <Text style={[styles.emptyFeedBody, { color: palette.muted }]}>
              {activeFilter === 'Following'
                ? 'Follow farmers and sellers to build a tighter, more personal stream.'
                : 'Try another filter or come back after more stories are shared.'}
            </Text>
          </View>
        ) : null}
      </>
    ),
    [activeFilter, filters, isLoading, mode, palette, posts.length, trendDigest.marketPost, trendDigest.topicPost, user]
  );

  const renderFeedItem = useCallback(
    ({ item, index }: { item: FeedPost; index: number }) => (
      <FeedPostCard
        post={item}
        index={index}
        palette={palette}
        isFocused={isFocused}
        isVisible={visiblePostIdsSet.has(item._id)}
        playbackPositions={playbackPositions}
        processingPostId={processingPostId}
        token={token}
        onOpenAuthor={openAuthorProfile}
        onOpenPost={openPost}
        onOpenLinkedProduct={openLinkedProduct}
        onToggleLike={handleToggleLike}
        onOpenComments={openComments}
        onToggleSave={handleToggleSave}
        onToggleFollow={handleToggleFollow}
        onReportPost={handleReportPost}
        onPlaybackTimeChange={handlePlaybackTimeChange}
      />
    ),
    [
      handlePlaybackTimeChange,
      handleToggleFollow,
      handleToggleLike,
      handleReportPost,
      handleToggleSave,
      isFocused,
      openAuthorProfile,
      openComments,
      openLinkedProduct,
      openPost,
      palette,
      playbackPositions,
      processingPostId,
      token,
      visiblePostIdsSet,
    ]
  );

  const footer = useMemo(
    () =>
      isLoadingMore ? (
        <View style={styles.loadMoreFooter}>
          <ActivityIndicator color={palette.tint} />
        </View>
      ) : null,
    [isLoadingMore, palette.tint]
  );

  return (
    <>
      <FlatList
        data={posts}
        keyExtractor={(item) => item._id}
        renderItem={renderFeedItem}
        style={[styles.screen, { backgroundColor: palette.background }]}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14 }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        onEndReached={() => void loadMorePosts()}
        onEndReachedThreshold={0.45}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfigRef.current}
      />

      <View style={[styles.floatingDock, { bottom: insets.bottom + 92 }]}>
        <Pressable
          onPress={() => setIsTuneSheetOpen(true)}
          style={[styles.floatingButton, { backgroundColor: `${palette.surfaceRaised}F2`, borderColor: palette.border }]}
          hitSlop={8}>
          <Feather name="search" size={20} color={palette.text} />
        </Pressable>
        <Pressable
          onPress={() => router.push('/modal')}
          style={[styles.floatingButton, styles.floatingPrimaryButton, { backgroundColor: `${palette.tint}EE` }]}
          hitSlop={8}>
          <Feather name="plus" size={22} color="#ffffff" />
        </Pressable>
      </View>

      <Modal visible={isTuneSheetOpen} animationType="fade" transparent onRequestClose={() => setIsTuneSheetOpen(false)}>
        <SafeAreaView style={styles.tuneModalRoot}>
          <Pressable
            style={[styles.commentModalOverlay, { backgroundColor: 'rgba(0,0,0,0.24)' }]}
            onPress={() => setIsTuneSheetOpen(false)}
          />
          <View style={[styles.tunePanel, { backgroundColor: `${palette.surfaceRaised}F7` }]}>
            <View style={styles.tuneHeader}>
              <View>
                <Text style={[styles.tuneEyebrow, { color: palette.tint }]}>Tune feed</Text>
                <Text style={[styles.tuneTitle, { color: palette.text }]}>What are you reading today?</Text>
              </View>
              <Pressable onPress={() => setIsTuneSheetOpen(false)} hitSlop={8}>
                <Feather name="x" size={20} color={palette.text} />
              </Pressable>
            </View>
            <View style={styles.tuneGrid}>
              {filters.map((chip) => (
                <Pressable
                  key={`tune-${chip}`}
                  onPress={() => {
                    setActiveFilter(chip);
                    setIsTuneSheetOpen(false);
                  }}
                  style={[
                    styles.tuneChip,
                    { backgroundColor: activeFilter === chip ? palette.text : palette.backgroundSecondary },
                  ]}>
                  <Text style={[styles.tuneChipText, { color: activeFilter === chip ? palette.background : palette.text }]}>
                    {chip}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal visible={Boolean(activePost)} animationType="slide" transparent onRequestClose={closeComments}>
        <SafeAreaView style={styles.commentModalRoot}>
          <Pressable style={[styles.commentModalOverlay, { backgroundColor: 'rgba(0,0,0,0.28)' }]} onPress={closeComments} />
          <View style={[styles.commentSheet, { backgroundColor: palette.surfaceRaised }]}>
            <View style={[styles.sheetHandle, { backgroundColor: palette.border }]} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: palette.text }]}>Comments</Text>
              <Pressable onPress={closeComments} hitSlop={8}>
                <Feather name="x" size={20} color={palette.text} />
              </Pressable>
            </View>

            {activePost ? (
              <View style={[styles.sheetPostPreview, { backgroundColor: palette.surface }]}>
                <Pressable onPress={() => openPost(activePost._id)} style={styles.sheetPostHeader}>
                  <SocialAvatar name={activePost.author.name} imageUrl={activePost.author.avatarUrl} size={30} />
                  <View style={styles.sheetPostCopy}>
                    <Text numberOfLines={1} style={[styles.sheetPostAuthor, { color: palette.text }]}>
                      {activePost.author.name}
                    </Text>
                    <Text numberOfLines={2} style={[styles.sheetPostHeadline, { color: palette.text }]}>
                      {activePost.headline}
                    </Text>
                  </View>
                </Pressable>
              </View>
            ) : null}

            <ScrollView
              style={styles.sheetCommentsList}
              contentContainerStyle={styles.sheetCommentsContent}
              showsVerticalScrollIndicator={false}>
              {isCommentsLoading ? (
                <View style={styles.loadingShell}>
                  <ActivityIndicator color={palette.tint} />
                </View>
              ) : sheetComments.length ? (
                sheetComments.map((comment) => (
                  <View key={comment._id} style={styles.sheetCommentRow}>
                    <SocialAvatar name={comment.author.name} imageUrl={comment.author.avatarUrl} size={32} />
                    <View style={styles.sheetCommentBodyWrap}>
                      <View style={[styles.sheetCommentBubble, { backgroundColor: palette.surface }]}>
                        <View style={styles.sheetCommentTop}>
                          <Text style={[styles.sheetCommentAuthor, { color: palette.text }]}>{comment.author.name}</Text>
                          <Text style={[styles.sheetCommentMeta, { color: palette.muted }]}>
                            {formatRelativeTime(comment.createdAt)}
                          </Text>
                        </View>
                        <Text style={[styles.sheetCommentText, { color: palette.text }]}>{comment.body}</Text>
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.sheetEmptyState}>
                  <Text style={[styles.sheetEmptyTitle, { color: palette.text }]}>No comments yet</Text>
                  <Text style={[styles.sheetEmptyBody, { color: palette.muted }]}>
                    Start the conversation with a short, useful comment.
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={[styles.sheetComposer, { backgroundColor: palette.surface }]}>
              <TextInput
                value={commentDraft}
                onChangeText={setCommentDraft}
                editable={Boolean(token) && !isSubmittingComment}
                placeholder={token ? 'What do you think of this?' : 'Sign in to comment'}
                placeholderTextColor={palette.muted}
                style={[styles.sheetInput, { color: palette.text }]}
              />
              <Pressable
                onPress={() => void handleCreateComment()}
                disabled={!token || isSubmittingComment || !commentDraft.trim()}
                style={[
                  styles.sheetSendButton,
                  {
                    backgroundColor:
                      !token || isSubmittingComment || !commentDraft.trim() ? palette.backgroundSecondary : palette.tint,
                  },
                ]}>
                <Ionicons
                  name="arrow-up"
                  size={16}
                  color={!token || isSubmittingComment || !commentDraft.trim() ? palette.muted : '#ffffff'}
                />
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 14, paddingTop: 14, gap: 12, paddingBottom: 98 },
  feedTopBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 2 },
  feedTitleWrap: { gap: 2 },
  eyebrow: { fontFamily: Fonts.rounded, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.3 },
  title: { fontFamily: Fonts.rounded, fontSize: 27, fontWeight: '800', lineHeight: 32 },
  teaBrief: { borderRadius: 20, padding: 15, gap: 10 },
  teaBriefHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  teaIcon: { width: 34, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  teaBriefTitleWrap: { flex: 1, gap: 2 },
  teaKicker: { fontFamily: Fonts.rounded, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.1 },
  teaTitle: { fontFamily: Fonts.rounded, fontSize: 18, fontWeight: '800', lineHeight: 23 },
  teaBody: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 21 },
  teaAside: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19 },
  teaLink: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  teaLinkText: { fontFamily: Fonts.rounded, fontSize: 13, fontWeight: '800' },
  topicRow: { gap: 8, paddingRight: 10, paddingVertical: 2 },
  topicChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, borderWidth: StyleSheet.hairlineWidth },
  topicChipText: { fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '800' },
  accountStrip: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 7, flexDirection: 'row', gap: 8, alignItems: 'center' },
  accountText: { flex: 1, gap: 2 },
  accountTitle: { fontFamily: Fonts.rounded, fontSize: 14, fontWeight: '700' },
  accountMeta: { fontFamily: Fonts.sans, fontSize: 12, fontWeight: '500' },
  loadingShell: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  loadMoreFooter: { alignItems: 'center', paddingVertical: 18 },
  loadingText: { fontFamily: Fonts.sans, fontSize: 13 },
  sectionHeader: { paddingHorizontal: 2 },
  sectionTitle: { fontFamily: Fonts.rounded, fontSize: 18, fontWeight: '700' },
  emptyFeedState: { paddingVertical: 18, gap: 6 },
  emptyFeedTitle: { fontFamily: Fonts.rounded, fontSize: 18, fontWeight: '700' },
  emptyFeedBody: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 20, maxWidth: 300 },
  floatingDock: {
    position: 'absolute',
    right: 16,
    bottom: 98,
    gap: 10,
    alignItems: 'center',
  },
  floatingButton: {
    width: 52,
    height: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  floatingPrimaryButton: { width: 58, height: 58, borderWidth: 0 },
  tuneModalRoot: { flex: 1, justifyContent: 'flex-end' },
  tunePanel: {
    margin: 14,
    borderRadius: 28,
    padding: 18,
    gap: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  tuneHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  tuneEyebrow: { fontFamily: Fonts.rounded, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2 },
  tuneTitle: { fontFamily: Fonts.rounded, fontSize: 22, fontWeight: '800', lineHeight: 28, marginTop: 3 },
  tuneGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tuneChip: { borderRadius: 999, paddingHorizontal: 13, paddingVertical: 10 },
  tuneChipText: { fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '800' },
  commentModalRoot: { flex: 1, justifyContent: 'flex-end' },
  commentModalOverlay: { ...StyleSheet.absoluteFillObject },
  commentSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    minHeight: '62%',
    maxHeight: '84%',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 12,
  },
  sheetHandle: { alignSelf: 'center', width: 48, height: 5, borderRadius: 999 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontFamily: Fonts.rounded, fontSize: 20, fontWeight: '700' },
  sheetPostPreview: { borderRadius: 18, padding: 12 },
  sheetPostHeader: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  sheetPostCopy: { flex: 1, gap: 2 },
  sheetPostAuthor: { fontFamily: Fonts.rounded, fontSize: 13, fontWeight: '700' },
  sheetPostHeadline: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 18 },
  sheetCommentsList: { flex: 1 },
  sheetCommentsContent: { gap: 12, paddingBottom: 8 },
  sheetCommentRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  sheetCommentBodyWrap: { flex: 1 },
  sheetCommentBubble: { borderRadius: 18, paddingHorizontal: 12, paddingVertical: 10, gap: 4 },
  sheetCommentTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, alignItems: 'center' },
  sheetCommentAuthor: { fontFamily: Fonts.rounded, fontSize: 13, fontWeight: '700' },
  sheetCommentMeta: { fontFamily: Fonts.sans, fontSize: 11 },
  sheetCommentText: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20 },
  sheetEmptyState: { alignItems: 'center', gap: 6, paddingVertical: 28 },
  sheetEmptyTitle: { fontFamily: Fonts.rounded, fontSize: 17, fontWeight: '700' },
  sheetEmptyBody: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19, textAlign: 'center', maxWidth: 250 },
  sheetComposer: { borderRadius: 18, padding: 8, flexDirection: 'row', gap: 8, alignItems: 'center' },
  sheetInput: { flex: 1, paddingHorizontal: 10, paddingVertical: 10, fontFamily: Fonts.sans, fontSize: 14 },
  sheetSendButton: { width: 38, height: 38, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});
