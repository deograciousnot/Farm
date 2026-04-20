import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { FeedMedia } from '@/components/feed-media';
import { SocialAvatar } from '@/components/social-avatar';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { api } from '@/lib/api';
import type { Comment, FeedPost } from '@/lib/types';
import { useSession } from '@/providers/session-provider';

function formatRelativeTime(value?: string) {
  if (!value) {
    return 'Now';
  }

  const date = new Date(value);
  const diffMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / (1000 * 60)));

  if (diffMinutes < 1) {
    return 'Just now';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours}h`;
  }

  return `${Math.floor(diffHours / 24)}d`;
}

type Palette = (typeof Colors)['light'] | (typeof Colors)['dark'];

const FeedPostCard = memo(function FeedPostCard({
  post,
  index,
  palette,
  isFocused,
  isVisible,
  playbackPositions,
  processingPostId,
  token,
  onOpenAuthor,
  onOpenPost,
  onOpenLinkedProduct,
  onToggleLike,
  onOpenComments,
  onToggleSave,
  onToggleFollow,
  onPlaybackTimeChange,
}: {
  post: FeedPost;
  index: number;
  palette: Palette;
  isFocused: boolean;
  isVisible: boolean;
  playbackPositions: Record<string, number>;
  processingPostId: string | null;
  token?: string | null;
  onOpenAuthor: (post: FeedPost) => void;
  onOpenPost: (postId: string) => void;
  onOpenLinkedProduct: (productId: string) => void;
  onToggleLike: (postId: string) => void;
  onOpenComments: (post: FeedPost) => void;
  onToggleSave: (postId: string) => void;
  onToggleFollow: (post: FeedPost) => void;
  onPlaybackTimeChange: (mediaUrl: string, currentTime: number) => void;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 5) * 35).duration(320)}
      style={[styles.postShell, { borderBottomColor: palette.border }]}>
      <View style={styles.postTopRow}>
        <Pressable onPress={() => onOpenAuthor(post)} style={styles.postIdentity}>
          <SocialAvatar name={post.author.name} imageUrl={post.author.avatarUrl} size={38} />
          <View style={styles.postIdentityText}>
            <View style={styles.postNameRow}>
              <Text style={[styles.postAuthor, { color: palette.text }]}>{post.author.name}</Text>
              {post.author.verificationStatus === 'top-rated' ? (
                <Ionicons name="checkmark-circle" size={14} color={palette.tint} />
              ) : null}
              <Text style={[styles.postMeta, { color: palette.muted }]}>{formatRelativeTime(post.createdAt)}</Text>
            </View>
            <Text style={[styles.postMeta, { color: palette.muted }]}>
              {post.author.role} · {post.location}
            </Text>
          </View>
        </Pressable>

        <View style={styles.postRightMeta}>
          <View
            style={[
              styles.postTag,
              {
                backgroundColor: post.isSponsored ? `${palette.accent}12` : `${palette.accentSecondary}16`,
              },
            ]}>
            <Text style={[styles.postTagText, { color: post.isSponsored ? palette.accent : palette.accentSecondary }]}>
              {post.tag}
            </Text>
          </View>
        </View>
      </View>

      <Pressable onPress={() => onOpenPost(post._id)} style={styles.postCopy}>
        <Text style={[styles.postHeadline, { color: palette.text }]}>{post.headline}</Text>
        <Text style={[styles.postBody, { color: palette.text }]}>
          {post.body.length > 220 ? `${post.body.slice(0, 220)}...` : post.body}
        </Text>
      </Pressable>

      {post.linkedProduct ? (
        <Pressable
          onPress={() => onOpenLinkedProduct(post.linkedProduct!._id)}
          style={[styles.linkedListingCard, { backgroundColor: palette.surface }]}>
          <View style={styles.linkedListingCopy}>
            <Text style={[styles.linkedListingLabel, { color: palette.tint }]}>Tagged listing</Text>
            <Text style={[styles.linkedListingName, { color: palette.text }]}>{post.linkedProduct.name}</Text>
            <Text style={[styles.linkedListingMeta, { color: palette.muted }]}>
              KES {post.linkedProduct.price} / {post.linkedProduct.unit} · {post.linkedProduct.location}
            </Text>
          </View>
          <Feather name="arrow-up-right" size={16} color={palette.muted} />
        </Pressable>
      ) : null}

      {post.media?.length ? (
        <FeedMedia
          media={post.media}
          onToggleLike={() => onToggleLike(post._id)}
          onOpenPost={() => onOpenPost(post._id)}
          allowPlayback={isFocused && isVisible}
          playbackPositions={playbackPositions}
          onPlaybackTimeChange={onPlaybackTimeChange}
        />
      ) : null}

      <View style={styles.postFooter}>
        <View style={styles.postActionsLeft}>
          <Pressable onPress={() => onToggleLike(post._id)} hitSlop={8} style={styles.iconMetric}>
            <Ionicons
              name={post.hasLiked ? 'heart' : 'heart-outline'}
              size={22}
              color={post.hasLiked ? palette.accent : palette.text}
            />
            <Text style={[styles.iconMetricText, { color: post.hasLiked ? palette.accent : palette.text }]}>
              {post.likesCount}
            </Text>
          </Pressable>

          <Pressable onPress={() => onOpenComments(post)} hitSlop={8} style={styles.iconMetric}>
            <Ionicons name="chatbubble-outline" size={20} color={palette.text} />
            <Text style={[styles.iconMetricText, { color: palette.text }]}>{post.commentsCount}</Text>
          </Pressable>
        </View>

        <Pressable onPress={() => onToggleSave(post._id)} hitSlop={8} style={styles.iconMetric}>
          <Ionicons
            name={post.hasSaved ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={post.hasSaved ? palette.accent : palette.text}
          />
        </Pressable>
      </View>

      {!post.isOwner && post.canFollowAuthor ? (
        <Pressable
          onPress={() => onToggleFollow(post)}
          style={[
            styles.followButton,
            { backgroundColor: post.isFollowingAuthor ? palette.surface : `${palette.tint}12` },
          ]}>
          <Text style={[styles.followButtonText, { color: post.isFollowingAuthor ? palette.text : palette.tint }]}>
            {processingPostId === post._id ? 'Updating...' : post.isFollowingAuthor ? 'Following' : 'Follow for insights'}
          </Text>
        </Pressable>
      ) : null}

      {post.recentComments.length > 0 ? (
        <Pressable onPress={() => onOpenComments(post)} style={styles.commentsPreview}>
          <Text style={[styles.viewCommentsText, { color: palette.muted }]}>
            View {post.commentsCount > 1 ? `all ${post.commentsCount} comments` : 'comment'}
          </Text>
          {post.recentComments.slice(0, 1).map((comment: Comment) => (
            <View key={comment._id} style={styles.commentRow}>
              <Text numberOfLines={2} style={[styles.commentText, { color: palette.muted }]}>
                <Text style={[styles.commentAuthor, { color: palette.text }]}>{comment.author.name} </Text>
                {comment.body}
              </Text>
            </View>
          ))}
        </Pressable>
      ) : token ? (
        <Pressable onPress={() => onOpenComments(post)}>
          <Text style={[styles.viewCommentsText, { color: palette.muted }]}>Be the first to comment</Text>
        </Pressable>
      ) : (
        <Text style={[styles.guestActionHint, { color: palette.muted }]}>
          Sign in to comment, save, follow people, and personalize your feed.
        </Text>
      )}
    </Animated.View>
  );
});

export default function HomeScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const isFocused = useIsFocused();
  const { token, user, mode } = useSession();
  const [isLoading, setIsLoading] = useState(true);
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
  const viewabilityConfigRef = useRef({ itemVisiblePercentThreshold: 65, minimumViewTime: 160 });

  const loadFeed = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await api.getFeed(token, activeFilter === 'All' ? undefined : activeFilter);
      setInterestChips(response.interestChips);
      setPosts(response.posts);
      setActiveFilter(response.activeFilter || 'All');
    } catch (error) {
      console.warn('Failed to load FarmConnect feed.', error);
    } finally {
      setIsLoading(false);
    }
  }, [activeFilter, token]);

  useFocusEffect(
    useCallback(() => {
      void loadFeed();
    }, [loadFeed])
  );

  const activePost = commentSheetPostId ? posts.find((post) => post._id === commentSheetPostId) ?? null : null;
  const visiblePostIdsSet = useMemo(() => new Set(visiblePostIds), [visiblePostIds]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ item: FeedPost | null }> }) => {
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

  const renderFeedHeader = useMemo(
    () => (
      <>
        <Animated.View
          entering={FadeInDown.duration(420).springify()}
          style={[styles.heroShell, { backgroundColor: palette.backgroundSecondary }]}>
          <View style={[styles.heroGlowLarge, { backgroundColor: `${palette.tint}18` }]} />
          <View style={[styles.heroGlowSmall, { backgroundColor: `${palette.accent}16` }]} />

          <View style={styles.heroTopRow}>
            <View style={styles.heroTitleWrap}>
              <Text style={[styles.eyebrow, { color: palette.tint }]}>Feed</Text>
              <Text style={[styles.title, { color: palette.text }]}>Fresh signals from farms, markets, and communities.</Text>
            </View>
            <View style={styles.heroIconRow}>
              <Pressable style={[styles.heroIconButton, { backgroundColor: palette.surface }]} hitSlop={8}>
                <Feather name="search" size={16} color={palette.text} />
              </Pressable>
              <Pressable style={[styles.heroIconButton, { backgroundColor: palette.surface }]} hitSlop={8}>
                <Feather name="sliders" size={16} color={palette.text} />
              </Pressable>
              <Pressable
                onPress={() => router.push('/modal')}
                style={[styles.heroIconButton, { backgroundColor: `${palette.tint}18` }]}
                hitSlop={8}>
                <Feather name="plus" size={16} color={palette.tint} />
              </Pressable>
            </View>
          </View>

          <Text style={[styles.subtitle, { color: palette.muted }]}>
            A tighter stream built for quick scanning, strong writing, and attached media.
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topicRow}>
            {interestChips.map((chip) => (
              <Pressable
                onPress={() => setActiveFilter(chip)}
                key={chip}
                style={[styles.topicChip, { backgroundColor: activeFilter === chip ? `${palette.tint}12` : palette.surface }]}>
                <Text style={[styles.topicChipText, { color: activeFilter === chip ? palette.tint : palette.text }]}>{chip}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </Animated.View>

        {user ? (
          <Animated.View entering={FadeIn.duration(300)} style={styles.accountStrip}>
            <SocialAvatar name={user.name} imageUrl={user.avatarUrl} size={34} />
            <View style={styles.accountText}>
              <Text style={[styles.accountTitle, { color: palette.text }]}>
                {user.name} <Text style={[styles.accountMeta, { color: palette.muted }]}>· {user.role}</Text>
              </Text>
              <Text style={[styles.accountHint, { color: palette.muted }]}>Your feed actions are live.</Text>
            </View>
          </Animated.View>
        ) : mode === 'guest' ? (
          <Animated.View entering={FadeIn.duration(300)} style={styles.accountStrip}>
            <Text style={[styles.accountTitle, { color: palette.text }]}>Guest mode</Text>
            <Text style={[styles.accountHint, { color: palette.muted }]}>
              Browse now, then sign in when you want comments, saves, orders, and your profile.
            </Text>
          </Animated.View>
        ) : null}

        {isLoading ? (
          <View style={styles.loadingShell}>
            <ActivityIndicator color={palette.tint} />
            <Text style={[styles.loadingText, { color: palette.muted }]}>Loading your feed...</Text>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>
            {activeFilter === 'Following' ? 'Following' : activeFilter === 'All' ? 'Latest' : activeFilter}
          </Text>
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
    [activeFilter, interestChips, isLoading, mode, palette, posts.length, user]
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
        onPlaybackTimeChange={handlePlaybackTimeChange}
      />
    ),
    [
      handlePlaybackTimeChange,
      handleToggleFollow,
      handleToggleLike,
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

  return (
    <>
      <FlatList
        data={posts}
        keyExtractor={(item) => item._id}
        renderItem={renderFeedItem}
        style={[styles.screen, { backgroundColor: palette.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderFeedHeader}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfigRef.current}
        removeClippedSubviews
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={5}
        updateCellsBatchingPeriod={60}
      />

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
  content: { paddingHorizontal: 14, paddingTop: 14, gap: 14, paddingBottom: 28 },
  heroShell: { borderRadius: 28, padding: 16, gap: 12, overflow: 'hidden' },
  heroGlowLarge: { position: 'absolute', width: 180, height: 180, borderRadius: 999, right: -52, top: -56 },
  heroGlowSmall: { position: 'absolute', width: 120, height: 120, borderRadius: 999, left: -20, bottom: -30 },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' },
  heroTitleWrap: { flex: 1, gap: 6 },
  eyebrow: { fontFamily: Fonts.rounded, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.3 },
  title: { fontFamily: Fonts.rounded, fontSize: 27, fontWeight: '700', lineHeight: 32, maxWidth: 300 },
  heroIconRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  heroIconButton: { width: 38, height: 38, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  subtitle: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20, maxWidth: 320 },
  topicRow: { gap: 8, paddingRight: 10 },
  topicChip: { borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 },
  topicChipText: { fontFamily: Fonts.rounded, fontSize: 11, fontWeight: '700' },
  accountStrip: { paddingHorizontal: 4, paddingVertical: 4, flexDirection: 'row', gap: 10, alignItems: 'center' },
  accountText: { flex: 1, gap: 2 },
  accountTitle: { fontFamily: Fonts.rounded, fontSize: 14, fontWeight: '700' },
  accountMeta: { fontFamily: Fonts.sans, fontSize: 12, fontWeight: '500' },
  accountHint: { fontFamily: Fonts.sans, fontSize: 12, lineHeight: 18, flex: 1 },
  loadingShell: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  loadingText: { fontFamily: Fonts.sans, fontSize: 13 },
  sectionHeader: { paddingHorizontal: 2 },
  sectionTitle: { fontFamily: Fonts.rounded, fontSize: 18, fontWeight: '700' },
  postShell: { gap: 10, paddingBottom: 18, borderBottomWidth: StyleSheet.hairlineWidth },
  postTopRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' },
  postIdentity: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  postIdentityText: { flex: 1, gap: 2 },
  postNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  postAuthor: { fontFamily: Fonts.rounded, fontSize: 14, fontWeight: '700' },
  postMeta: { fontFamily: Fonts.sans, fontSize: 12 },
  postRightMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  postTag: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  postTagText: { fontFamily: Fonts.rounded, fontSize: 11, fontWeight: '700' },
  postCopy: { gap: 6 },
  linkedListingCard: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  linkedListingCopy: { flex: 1, gap: 2 },
  linkedListingLabel: { fontFamily: Fonts.rounded, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.9 },
  linkedListingName: { fontFamily: Fonts.rounded, fontSize: 14, fontWeight: '700' },
  linkedListingMeta: { fontFamily: Fonts.sans, fontSize: 12, lineHeight: 18 },
  postHeadline: { fontFamily: Fonts.rounded, fontSize: 19, fontWeight: '700', lineHeight: 25 },
  postBody: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 21 },
  postFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingTop: 2 },
  postActionsLeft: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  iconMetric: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 24 },
  iconMetricText: { fontFamily: Fonts.sans, fontSize: 12, fontWeight: '700' },
  followButton: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  followButtonText: { fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '700' },
  commentsPreview: { gap: 6 },
  viewCommentsText: { fontFamily: Fonts.sans, fontSize: 12, lineHeight: 18 },
  commentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  commentText: { flex: 1, fontFamily: Fonts.sans, fontSize: 12, lineHeight: 18 },
  commentAuthor: { fontFamily: Fonts.rounded, fontWeight: '700' },
  guestActionHint: { fontFamily: Fonts.sans, fontSize: 11, lineHeight: 16, marginTop: -2 },
  emptyFeedState: { paddingVertical: 18, gap: 6 },
  emptyFeedTitle: { fontFamily: Fonts.rounded, fontSize: 18, fontWeight: '700' },
  emptyFeedBody: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 20, maxWidth: 300 },
  commentModalRoot: { flex: 1, justifyContent: 'flex-end' },
  commentModalOverlay: { ...StyleSheet.absoluteFillObject },
  commentSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, minHeight: '62%', maxHeight: '84%', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, gap: 12 },
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
