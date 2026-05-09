import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

  if (diffMinutes < 60) {
    return `${Math.max(1, diffMinutes)}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  return `${Math.floor(diffHours / 24)}d ago`;
}

export default function PostDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { token } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isCommentsLoading, setIsCommentsLoading] = useState(true);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [processingFollow, setProcessingFollow] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [post, setPost] = useState<FeedPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentDraft, setCommentDraft] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadPost() {
      if (!params.id) {
        setIsLoading(false);
        setIsCommentsLoading(false);
        return;
      }

      try {
        const [postResponse, commentsResponse] = await Promise.all([
          api.getFeedPostById(params.id, token),
          api.getComments(params.id),
        ]);

        if (!isMounted) {
          return;
        }

        setPost(postResponse.item);
        setComments(commentsResponse.items);
      } catch (error) {
        console.warn('Failed to load post.', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsCommentsLoading(false);
        }
      }
    }

    void loadPost();

    return () => {
      isMounted = false;
    };
  }, [params.id, token]);

  async function handleToggleLike() {
    if (!token || !post) {
      return;
    }

    const previousPost = post;

    setPost({
      ...post,
      hasLiked: !post.hasLiked,
      likesCount: post.hasLiked ? Math.max(0, post.likesCount - 1) : post.likesCount + 1,
    });

    try {
      const response = await api.toggleLike(token, post._id);
      setPost((current) =>
        current
          ? {
              ...current,
              hasLiked: response.liked,
              likesCount: response.likesCount,
            }
          : current
      );
    } catch (error) {
      setPost(previousPost);
      Alert.alert('Like failed', error instanceof Error ? error.message : 'Something went wrong.');
    }
  }

  async function handleToggleSave() {
    if (!token || !post) {
      return;
    }

    try {
      const response = await api.toggleSave(token, post._id);
      setPost((current) =>
        current
          ? {
              ...current,
              hasSaved: response.saved,
              savesCount: response.savesCount,
            }
          : current
      );
    } catch (error) {
      Alert.alert('Save failed', error instanceof Error ? error.message : 'Something went wrong.');
    }
  }

  async function handleToggleFollow() {
    if (!token || !post?.canFollowAuthor) {
      return;
    }

    const userId = post.author._id ?? post.author.id;

    if (!userId) {
      return;
    }

    setProcessingFollow(true);

    try {
      const response = await api.toggleFollow(token, userId);
      setPost((current) =>
        current
          ? {
              ...current,
              isFollowingAuthor: response.following,
              author: {
                ...current.author,
                followersCount: response.followersCount,
              },
            }
          : current
      );
    } catch (error) {
      Alert.alert('Follow failed', error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setProcessingFollow(false);
    }
  }

  async function handleCreateComment() {
    if (!token || !post || !commentDraft.trim() || isSubmittingComment) {
      return;
    }

    const message = commentDraft.trim();
    setIsSubmittingComment(true);

    try {
      const response = await api.createComment(token, post._id, message);
      setComments((current) => [response.item, ...current]);
      setCommentDraft('');
      setPost((current) =>
        current
          ? {
              ...current,
              commentsCount: response.commentsCount,
            }
          : current
      );
    } catch (error) {
      Alert.alert('Comment failed', error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setIsSubmittingComment(false);
    }
  }

  async function handleDeletePost() {
    if (!token || !post || !post.isOwner || isDeleting) {
      return;
    }

    setIsDeleting(true);

    try {
      await api.deleteFeedPost(token, post._id);
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Delete failed', error instanceof Error ? error.message : 'Something went wrong.');
      setIsDeleting(false);
    }
  }

  function requestDeletePost() {
    if (!post?.isOwner) {
      return;
    }

    Alert.alert('Delete post?', 'This removes it from your feed and profile.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void handleDeletePost();
        },
      },
    ]);
  }

  const commentCountLabel = comments.length === 1 ? '1 comment' : `${comments.length} comments`;
  const longRead = post ? post.body.trim().length > 240 : false;
  const bodyBlocks = post?.bodyBlocks?.length
    ? post.bodyBlocks
    : post
      ? post.body
          .split(/\n{2,}/)
          .map((item) => item.trim())
          .filter(Boolean)
          .map((text) => ({ type: 'paragraph' as const, text }))
      : [];
  const hasInlineMedia = bodyBlocks.some((block) => block.type === 'image' || block.type === 'video');

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={[styles.iconButton, { backgroundColor: palette.surface }]}>
            <Feather name="arrow-left" size={18} color={palette.text} />
          </Pressable>
          <Text style={[styles.topBarTitle, { color: palette.text }]}>Post</Text>
          {post?.isOwner ? (
            <Pressable
              onPress={requestDeletePost}
              disabled={isDeleting}
              style={[styles.iconButton, { backgroundColor: palette.surface }]}>
              <Feather name="trash-2" size={17} color={palette.accent} />
            </Pressable>
          ) : (
            <View style={styles.spacer} />
          )}
        </View>

        {isLoading ? (
          <View style={styles.loadingShell}>
            <ActivityIndicator color={palette.tint} />
          </View>
        ) : post ? (
          <>
            <View style={styles.header}>
              <Pressable
                onPress={() => {
                  const authorId = post.author._id ?? post.author.id;

                  if (authorId) {
                    router.push({ pathname: '/profile/[id]', params: { id: authorId } });
                  }
                }}
                style={styles.authorRow}>
                <SocialAvatar name={post.author.name} imageUrl={post.author.avatarUrl} size={42} />
                <View style={styles.authorText}>
                  <Text style={[styles.authorName, { color: palette.text }]}>{post.author.name}</Text>
                  <Text style={[styles.authorMeta, { color: palette.muted }]}>
                    {post.author.role} - {post.location} - {formatRelativeTime(post.createdAt)}
                  </Text>
                  {typeof post.author.followersCount === 'number' ? (
                    <Text style={[styles.authorSubMeta, { color: palette.muted }]}>
                      {post.author.followersCount} followers
                    </Text>
                  ) : null}
                </View>
              </Pressable>
              {!post.isOwner && post.canFollowAuthor ? (
                <Pressable
                  onPress={() => void handleToggleFollow()}
                  style={[styles.followButton, { backgroundColor: post.isFollowingAuthor ? palette.surface : `${palette.tint}12` }]}>
                  <Text style={[styles.followButtonText, { color: post.isFollowingAuthor ? palette.text : palette.tint }]}>
                    {processingFollow ? 'Updating...' : post.isFollowingAuthor ? 'Following' : 'Follow'}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.storyMetaRow}>
              {post.tag ? (
                <View style={[styles.storyMetaPill, { backgroundColor: `${palette.tint}14` }]}>
                  <Text style={[styles.storyMetaText, { color: palette.tint }]}>{post.tag}</Text>
                </View>
              ) : null}
              {longRead ? (
                <View style={[styles.storyMetaPill, { backgroundColor: palette.surface }]}>
                  <Text style={[styles.storyMetaText, { color: palette.text }]}>Long read</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.copyBlock}>
              <Text style={[styles.headline, { color: palette.text }]}>{post.headline}</Text>
              {bodyBlocks.map((block, index) => {
                if (block.type === 'paragraph') {
                  return (
                    <Text key={`${post._id}-body-${index}`} style={[styles.body, { color: palette.text }]}>
                      {block.text}
                    </Text>
                  );
                }

                return (
                  <View key={`${post._id}-media-${index}`} style={styles.inlineMediaBlock}>
                    <FeedMedia media={[block]} onToggleLike={() => void handleToggleLike()} mode="detail" />
                  </View>
                );
              })}
            </View>

            {post.linkedProduct ? (
              <Pressable
                onPress={() => router.push({ pathname: '/product/[id]', params: { id: post.linkedProduct!._id } })}
                style={[styles.linkedListingCard, { backgroundColor: palette.surface }]}>
                <View style={styles.linkedListingCopy}>
                  <Text style={[styles.linkedListingLabel, { color: palette.tint }]}>Tagged listing</Text>
                  <Text style={[styles.linkedListingName, { color: palette.text }]}>{post.linkedProduct.name}</Text>
                  <Text style={[styles.linkedListingMeta, { color: palette.muted }]}>
                    KES {post.linkedProduct.price} / {post.linkedProduct.unit} - {post.linkedProduct.location}
                  </Text>
                </View>
                <Feather name="arrow-up-right" size={16} color={palette.muted} />
              </Pressable>
            ) : null}

            {post.media?.length && !hasInlineMedia ? (
              <FeedMedia media={post.media} onToggleLike={() => void handleToggleLike()} mode="detail" />
            ) : null}

            <View style={styles.actionRow}>
              <Pressable onPress={() => void handleToggleLike()} style={styles.actionItem}>
                <Ionicons
                  name={post.hasLiked ? 'heart' : 'heart-outline'}
                  size={22}
                  color={post.hasLiked ? palette.accent : palette.text}
                />
                <Text style={[styles.actionText, { color: post.hasLiked ? palette.accent : palette.text }]}>
                  {post.likesCount}
                </Text>
              </Pressable>
              <View style={styles.actionItem}>
                <Ionicons name="chatbubble-outline" size={20} color={palette.text} />
                <Text style={[styles.actionText, { color: palette.text }]}>{post.commentsCount}</Text>
              </View>
              <Pressable onPress={() => void handleToggleSave()} style={styles.actionItem}>
                <Ionicons
                  name={post.hasSaved ? 'bookmark' : 'bookmark-outline'}
                  size={20}
                  color={post.hasSaved ? palette.accent : palette.text}
                />
                <Text style={[styles.actionText, { color: post.hasSaved ? palette.accent : palette.text }]}>
                  {post.savesCount}
                </Text>
              </Pressable>
            </View>

            <View style={styles.commentsSection}>
              <View style={styles.commentsHeader}>
                <Text style={[styles.commentsTitle, { color: palette.text }]}>Conversation</Text>
                <Text style={[styles.commentsCount, { color: palette.muted }]}>{commentCountLabel}</Text>
              </View>

              {token ? (
                <View style={[styles.commentComposer, { backgroundColor: palette.surface }]}>
                  <TextInput
                    value={commentDraft}
                    onChangeText={setCommentDraft}
                    placeholder="Add a useful comment..."
                    placeholderTextColor={palette.muted}
                    multiline
                    style={[styles.commentInput, { color: palette.text }]}
                  />
                  <Pressable
                    onPress={() => void handleCreateComment()}
                    disabled={!commentDraft.trim() || isSubmittingComment}
                    style={[
                      styles.sendButton,
                      {
                        backgroundColor: commentDraft.trim() ? palette.tint : palette.backgroundTertiary,
                      },
                    ]}>
                    {isSubmittingComment ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Ionicons
                        name="arrow-up"
                        size={16}
                        color={commentDraft.trim() ? '#ffffff' : palette.muted}
                      />
                    )}
                  </Pressable>
                </View>
              ) : (
                <Text style={[styles.commentHelper, { color: palette.muted }]}>
                  Sign in to reply, save, and join the conversation.
                </Text>
              )}

              {isCommentsLoading ? (
                <View style={styles.commentsLoading}>
                  <ActivityIndicator color={palette.tint} />
                </View>
              ) : comments.length ? (
                comments.map((comment) => (
                  <View key={comment._id} style={[styles.commentCard, { backgroundColor: palette.surface }]}>
                    <View style={styles.commentAuthorRow}>
                      <SocialAvatar name={comment.author.name} imageUrl={comment.author.avatarUrl} size={34} />
                      <View style={styles.commentAuthorText}>
                        <Text style={[styles.commentAuthorName, { color: palette.text }]}>{comment.author.name}</Text>
                        <Text style={[styles.commentAuthorMeta, { color: palette.muted }]}>
                          {comment.author.role} - {formatRelativeTime(comment.createdAt)}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.commentBody, { color: palette.text }]}>{comment.body}</Text>
                  </View>
                ))
              ) : (
                <View style={[styles.emptyComments, { backgroundColor: palette.surface }]}>
                  <Text style={[styles.emptyCommentsTitle, { color: palette.text }]}>Be the first voice here</Text>
                  <Text style={[styles.emptyCommentsBody, { color: palette.muted }]}>
                    Ask a follow-up, share a tip, or add context for the next farmer reading this.
                  </Text>
                </View>
              )}
            </View>
          </>
        ) : (
          <View style={styles.loadingShell}>
            <Text style={[styles.emptyText, { color: palette.muted }]}>Post not found.</Text>
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
  loadingShell: { minHeight: 180, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  authorRow: { flexDirection: 'row', gap: 12, flex: 1 },
  authorText: { flex: 1 },
  authorName: { fontFamily: Fonts.rounded, fontSize: 16, fontWeight: '700' },
  authorMeta: { fontFamily: Fonts.sans, fontSize: 12, marginTop: 4 },
  authorSubMeta: { fontFamily: Fonts.sans, fontSize: 12, marginTop: 4 },
  followButton: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  followButtonText: { fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '700' },
  storyMetaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  storyMetaPill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  storyMetaText: { fontFamily: Fonts.rounded, fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  copyBlock: { gap: 14 },
  inlineMediaBlock: { marginVertical: 4 },
  linkedListingCard: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  linkedListingCopy: { flex: 1, gap: 3 },
  linkedListingLabel: { fontFamily: Fonts.rounded, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.9 },
  linkedListingName: { fontFamily: Fonts.rounded, fontSize: 15, fontWeight: '700' },
  linkedListingMeta: { fontFamily: Fonts.sans, fontSize: 12, lineHeight: 18 },
  headline: { fontFamily: Fonts.rounded, fontSize: 28, fontWeight: '700', lineHeight: 34 },
  body: { fontFamily: Fonts.sans, fontSize: 17, lineHeight: 28 },
  actionRow: { flexDirection: 'row', gap: 18, alignItems: 'center', paddingTop: 4 },
  actionItem: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  actionText: { fontFamily: Fonts.sans, fontSize: 13, fontWeight: '700' },
  commentsSection: { gap: 14, paddingTop: 10 },
  commentsHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  commentsTitle: { fontFamily: Fonts.rounded, fontSize: 20, fontWeight: '700' },
  commentsCount: { fontFamily: Fonts.sans, fontSize: 13 },
  commentComposer: {
    borderRadius: 22,
    paddingLeft: 16,
    paddingRight: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  commentInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    paddingTop: 0,
    paddingBottom: 0,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentHelper: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 20 },
  commentsLoading: { minHeight: 80, alignItems: 'center', justifyContent: 'center' },
  commentCard: { borderRadius: 22, padding: 16, gap: 12 },
  commentAuthorRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  commentAuthorText: { flex: 1 },
  commentAuthorName: { fontFamily: Fonts.rounded, fontSize: 14, fontWeight: '700' },
  commentAuthorMeta: { fontFamily: Fonts.sans, fontSize: 12, marginTop: 2 },
  commentBody: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 22 },
  emptyComments: { borderRadius: 22, padding: 18, gap: 8 },
  emptyCommentsTitle: { fontFamily: Fonts.rounded, fontSize: 16, fontWeight: '700' },
  emptyCommentsBody: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 20 },
  emptyText: { fontFamily: Fonts.sans, fontSize: 14 },
});
