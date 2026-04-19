import { Link } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { FeedMedia } from '@/components/feed-media';
import { ProductCard } from '@/components/product-card';
import { SocialAvatar } from '@/components/social-avatar';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { api } from '@/lib/api';
import type { Comment, FeedPost, Product } from '@/lib/types';
import { useSession } from '@/providers/session-provider';

export default function HomeScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { token, user, mode } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [interestChips, setInterestChips] = useState<string[]>([]);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [previewProducts, setPreviewProducts] = useState<Product[]>([]);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('All');

  const loadFeed = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await api.getFeed(token, activeFilter === 'All' ? undefined : activeFilter);
      setInterestChips(response.interestChips);
      setPosts(response.posts);
      setPreviewProducts(response.previewProducts);
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

  const storyUsers = useMemo(() => {
    const uniqueUsers = new Map<string, FeedPost['author']>();

    for (const post of posts) {
      const key = post.author._id ?? post.author.id ?? post.author.name;

      if (!uniqueUsers.has(key)) {
        uniqueUsers.set(key, post.author);
      }
    }

    return Array.from(uniqueUsers.values());
  }, [posts]);

  async function handleToggleSave(postId: string) {
    if (!token) {
      return;
    }

    try {
      const response = await api.toggleSave(token, postId);

      setPosts((current) =>
        current.map((post) =>
          post._id === postId
            ? { ...post, hasSaved: response.saved, savesCount: response.savesCount }
            : post
        )
      );
    } catch (error) {
      console.warn('Failed to toggle save.', error);
    }
  }

  async function handleToggleLike(postId: string) {
    if (!token) {
      return;
    }

    const previousPosts = posts;

    setPosts((current) =>
      current.map((post) =>
        post._id === postId
          ? {
              ...post,
              hasLiked: !post.hasLiked,
              likesCount: post.hasLiked ? Math.max(0, post.likesCount - 1) : post.likesCount + 1,
            }
          : post
      )
    );

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
      setPosts(previousPosts);
      console.warn('Failed to toggle like.', error);
    }
  }

  async function handleCreateComment(postId: string) {
    if (!token) {
      return;
    }

    const body = commentDrafts[postId]?.trim();

    if (!body) {
      return;
    }

    try {
      const response = await api.createComment(token, postId, body);

      setPosts((current) =>
        current.map((post) =>
          post._id === postId
            ? {
                ...post,
                commentsCount: response.commentsCount,
                recentComments: [response.item, ...post.recentComments].slice(0, 2),
              }
            : post
        )
      );
      setCommentDrafts((current) => ({ ...current, [postId]: '' }));
      setActivePostId(null);
    } catch (error) {
      console.warn('Failed to create comment.', error);
    }
  }

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: palette.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <Animated.View
        entering={FadeInDown.duration(450).springify()}
        style={[styles.heroShell, { backgroundColor: palette.backgroundSecondary }]}>
        <View style={[styles.heroGlowLarge, { backgroundColor: `${palette.tint}18` }]} />
        <View style={[styles.heroGlowSmall, { backgroundColor: `${palette.accent}16` }]} />

        <View style={styles.heroTopRow}>
          <View style={styles.heroTitleWrap}>
            <Text style={[styles.eyebrow, { color: palette.tint }]}>Feed</Text>
            <Text style={[styles.title, { color: palette.text }]}>Fresh signals from farms, markets, and communities.</Text>
          </View>
          <View style={[styles.signalChip, { backgroundColor: `${palette.tint}12` }]}>
            <Text style={[styles.signalChipText, { color: palette.tint }]}>For you</Text>
          </View>
        </View>

        <Text style={[styles.subtitle, { color: palette.muted }]}>
          Cleaner, tighter, and less boxed-in. This feed now leans more editorial than dashboard.
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesRow}>
          {storyUsers.map((storyUser) => (
            <View key={storyUser._id ?? storyUser.id ?? storyUser.name} style={styles.storyItem}>
              <View style={[styles.storyRing, { backgroundColor: `${palette.tint}14` }]}>
                <SocialAvatar name={storyUser.name} imageUrl={storyUser.avatarUrl} size={52} />
              </View>
              <Text numberOfLines={1} style={[styles.storyName, { color: palette.text }]}>
                {storyUser.name.split(' ')[0]}
              </Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.topicRow}>
          {interestChips.map((chip, index) => (
            <Pressable
              onPress={() => setActiveFilter(chip)}
              key={chip}
              style={[
                styles.topicChip,
                {
                  backgroundColor: activeFilter === chip ? `${palette.tint}12` : palette.surface,
                },
              ]}>
              <Text style={[styles.topicChipText, { color: activeFilter === chip ? palette.tint : palette.text }]}>{chip}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.heroActions}>
          <Link href="/modal" asChild>
            <Pressable style={[styles.quickLink, { backgroundColor: palette.surfaceRaised }]}>
              <Feather name="plus-square" size={14} color={palette.text} />
              <Text style={[styles.quickLinkText, { color: palette.text }]}>Create</Text>
            </Pressable>
          </Link>
          <Link href="/(tabs)/community" asChild>
            <Pressable style={[styles.quickLink, styles.primaryQuickLink, { backgroundColor: palette.tint }]}>
              <Text style={styles.primaryQuickLinkText}>Community</Text>
            </Pressable>
          </Link>
          <Link href="/(tabs)/marketplace" asChild>
            <Pressable style={[styles.quickLink, { backgroundColor: palette.surfaceRaised }]}>
              <Text style={[styles.quickLinkText, { color: palette.text }]}>Marketplace</Text>
            </Pressable>
          </Link>
        </View>
      </Animated.View>

      {user ? (
        <Animated.View
          entering={FadeIn.duration(350)}
          style={[styles.accountStrip, { backgroundColor: palette.surfaceRaised }]}>
          <SocialAvatar name={user.name} imageUrl={user.avatarUrl} size={36} />
          <View style={styles.accountText}>
            <Text style={[styles.accountTitle, { color: palette.text }]}>
              {user.name} <Text style={[styles.accountMeta, { color: palette.muted }]}>- {user.role}</Text>
            </Text>
            <Text style={[styles.accountHint, { color: palette.muted }]}>Your comments and saves are live.</Text>
          </View>
        </Animated.View>
      ) : mode === 'guest' ? (
        <Animated.View
          entering={FadeIn.duration(350)}
          style={[styles.accountStrip, { backgroundColor: palette.surfaceRaised }]}>
          <Text style={[styles.accountTitle, { color: palette.text }]}>Guest mode</Text>
          <Text style={[styles.accountHint, { color: palette.muted }]}>
            Browse freely now. Sign in for comments, saves, orders, and your profile.
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
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Latest</Text>
      </View>

      {posts.map((post, index) => (
        <Animated.View
          key={post._id}
          entering={FadeInDown.delay(index * 45).duration(420)}
          style={[styles.postCard, { backgroundColor: palette.surfaceRaised }]}>
          <View style={styles.postTopRow}>
            <View style={styles.postIdentity}>
              <SocialAvatar name={post.author.name} imageUrl={post.author.avatarUrl} size={38} />
              <View style={styles.postIdentityText}>
                <Text style={[styles.postAuthor, { color: palette.text }]}>{post.author.name}</Text>
                <Text style={[styles.postMeta, { color: palette.muted }]}>
                  {post.author.role} - {post.location}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.postTag,
                {
                  backgroundColor: post.isSponsored ? `${palette.accent}12` : `${palette.accentSecondary}16`,
                },
              ]}>
              <Text
                style={[
                  styles.postTagText,
                  { color: post.isSponsored ? palette.accent : palette.accentSecondary },
                ]}>
                {post.tag}
              </Text>
            </View>
          </View>

          <View style={styles.postCopy}>
            <Text style={[styles.postHeadline, { color: palette.text }]}>{post.headline}</Text>
            <Text style={[styles.postBody, { color: palette.muted }]}>{post.body}</Text>
          </View>

          {post.media?.length ? <FeedMedia media={post.media} /> : null}

          <View style={styles.postFooter}>
            <View style={styles.postActionsLeft}>
              <Pressable onPress={() => handleToggleLike(post._id)} hitSlop={8} style={styles.iconMetric}>
                <Ionicons
                  name={post.hasLiked ? 'heart' : 'heart-outline'}
                  size={20}
                  color={post.hasLiked ? palette.accent : palette.text}
                />
                <Text style={[styles.iconMetricText, { color: post.hasLiked ? palette.accent : palette.text }]}>
                  {post.likesCount}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setActivePostId(activePostId === post._id ? null : post._id)}
                hitSlop={8}
                style={styles.iconMetric}>
                <Ionicons
                  name={activePostId === post._id ? 'chatbubble' : 'chatbubble-outline'}
                  size={19}
                  color={activePostId === post._id ? palette.tint : palette.text}
                />
                <Text
                  style={[
                    styles.iconMetricText,
                    { color: activePostId === post._id ? palette.tint : palette.text },
                  ]}>
                  {post.commentsCount}
                </Text>
              </Pressable>
              <View style={styles.iconMetric}>
                <Ionicons name="paper-plane-outline" size={18} color={palette.text} />
              </View>
            </View>

            <Pressable onPress={() => handleToggleSave(post._id)} hitSlop={8} style={styles.iconMetric}>
              <Ionicons
                name={post.hasSaved ? 'bookmark' : 'bookmark-outline'}
                size={19}
                color={post.hasSaved ? palette.accent : palette.text}
              />
              {token ? (
                <Text style={[styles.iconMetricText, { color: post.hasSaved ? palette.accent : palette.text }]}>
                  {post.savesCount}
                </Text>
              ) : null}
            </Pressable>
          </View>

          {!token ? (
            <Text style={[styles.guestActionHint, { color: palette.muted }]}>
              Sign in to comment, save, and personalize your feed.
            </Text>
          ) : null}

          <View style={styles.postMetaStrip}>
            <Text style={[styles.postMetaLine, { color: palette.muted }]}>
              {post.likesCount} likes
            </Text>
            <Text style={[styles.postMetaLine, { color: palette.muted }]}>
              {post.commentsCount} comments
            </Text>
            <Text style={[styles.postMetaLine, { color: palette.muted }]}>
              {post.savesCount} saves
            </Text>
          </View>

          {post.recentComments.length > 0 ? (
            <View style={styles.commentsPreview}>
              {post.recentComments.map((comment: Comment) => (
                <View key={comment._id} style={styles.commentRow}>
                  <SocialAvatar name={comment.author.name} imageUrl={comment.author.avatarUrl} size={22} />
                  <Text numberOfLines={2} style={[styles.commentText, { color: palette.muted }]}>
                    <Text style={[styles.commentAuthor, { color: palette.text }]}>{comment.author.name}: </Text>
                    {comment.body}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {activePostId === post._id ? (
            <View style={[styles.commentComposer, { backgroundColor: palette.surface }]}>
              <TextInput
                value={commentDrafts[post._id] ?? ''}
                onChangeText={(value) => setCommentDrafts((current) => ({ ...current, [post._id]: value }))}
                placeholder="Add a comment..."
                placeholderTextColor={palette.muted}
                style={[styles.commentInput, { color: palette.text }]}
              />
              <Pressable onPress={() => handleCreateComment(post._id)} style={[styles.sendButton, { backgroundColor: palette.tint }]}>
                <Text style={styles.sendButtonText}>Post</Text>
              </Pressable>
            </View>
          ) : null}
        </Animated.View>
      ))}

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Marketplace picks</Text>
      </View>

      {previewProducts.map((product) => (
        <ProductCard key={product._id} product={product} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 14, paddingTop: 14, gap: 14, paddingBottom: 28 },
  heroShell: {
    borderRadius: 28,
    padding: 16,
    gap: 12,
    overflow: 'hidden',
  },
  heroGlowLarge: { position: 'absolute', width: 180, height: 180, borderRadius: 999, right: -52, top: -56 },
  heroGlowSmall: { position: 'absolute', width: 120, height: 120, borderRadius: 999, left: -20, bottom: -30 },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' },
  heroTitleWrap: { flex: 1, gap: 6 },
  eyebrow: {
    fontFamily: Fonts.rounded,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.3,
  },
  title: { fontFamily: Fonts.rounded, fontSize: 27, fontWeight: '700', lineHeight: 32, maxWidth: 300 },
  signalChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  signalChipText: { fontFamily: Fonts.rounded, fontSize: 11, fontWeight: '700' },
  subtitle: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20, maxWidth: 320 },
  storiesRow: { gap: 12, paddingVertical: 2 },
  storyItem: { width: 62, gap: 7, alignItems: 'center' },
  storyRing: { padding: 3, borderRadius: 999 },
  storyName: { fontFamily: Fonts.sans, fontSize: 11, fontWeight: '700' },
  topicRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  topicChip: { borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 },
  topicChipText: { fontFamily: Fonts.rounded, fontSize: 11, fontWeight: '700' },
  heroActions: { flexDirection: 'row', gap: 8, marginTop: 2 },
  quickLink: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 8 },
  primaryQuickLink: { minWidth: 106, alignItems: 'center' },
  primaryQuickLinkText: { color: '#ffffff', fontFamily: Fonts.rounded, fontWeight: '700', fontSize: 13 },
  quickLinkText: { fontFamily: Fonts.rounded, fontWeight: '700', fontSize: 13 },
  accountStrip: {
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  accountText: { flex: 1, gap: 2 },
  accountTitle: { fontFamily: Fonts.rounded, fontSize: 14, fontWeight: '700' },
  accountMeta: { fontFamily: Fonts.sans, fontSize: 12, fontWeight: '500' },
  accountHint: { fontFamily: Fonts.sans, fontSize: 12, lineHeight: 18, flex: 1 },
  loadingShell: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  loadingText: { fontFamily: Fonts.sans, fontSize: 13 },
  sectionHeader: { paddingHorizontal: 2 },
  sectionTitle: { fontFamily: Fonts.rounded, fontSize: 18, fontWeight: '700' },
  postCard: {
    borderRadius: 24,
    padding: 14,
    gap: 12,
  },
  postTopRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, alignItems: 'center' },
  postIdentity: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  postIdentityText: { flex: 1, gap: 2 },
  postAuthor: { fontFamily: Fonts.rounded, fontSize: 14, fontWeight: '700' },
  postMeta: { fontFamily: Fonts.sans, fontSize: 12 },
  postTag: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  postTagText: { fontFamily: Fonts.rounded, fontSize: 11, fontWeight: '700' },
  postCopy: { gap: 6 },
  postHeadline: { fontFamily: Fonts.rounded, fontSize: 18, fontWeight: '700', lineHeight: 24 },
  postBody: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20 },
  postFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingTop: 2 },
  postActionsLeft: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  iconMetric: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 24 },
  iconMetricText: { fontFamily: Fonts.sans, fontSize: 12, fontWeight: '700' },
  guestActionHint: { fontFamily: Fonts.sans, fontSize: 11, lineHeight: 16, marginTop: -2 },
  postMetaStrip: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: -2 },
  postMetaLine: { fontFamily: Fonts.sans, fontSize: 11, lineHeight: 16 },
  commentsPreview: { gap: 7 },
  commentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  commentText: { flex: 1, fontFamily: Fonts.sans, fontSize: 12, lineHeight: 18 },
  commentAuthor: { fontFamily: Fonts.rounded, fontWeight: '700' },
  commentComposer: {
    borderRadius: 18,
    padding: 10,
    gap: 8,
  },
  commentInput: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontFamily: Fonts.sans,
    fontSize: 14,
  },
  sendButton: { alignSelf: 'flex-end', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  sendButtonText: { color: '#ffffff', fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '700' },
});
