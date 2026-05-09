import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { FeedMedia } from '@/components/feed-media';
import { SocialAvatar } from '@/components/social-avatar';
import { Fonts } from '@/constants/theme';
import type { Comment, FeedPost } from '@/lib/types';
import { FeedPalette, formatRelativeTime } from '@/utils/feed-utils';

type MediaBlock = NonNullable<FeedPost['bodyBlocks']>[number] & { type: 'image' | 'video'; url: string };

type FeedPostCardProps = {
  post: FeedPost;
  index: number;
  palette: FeedPalette;
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
};

export const FeedPostCard = memo(function FeedPostCard({
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
}: FeedPostCardProps) {
  const linkedProduct = post.linkedProduct;
  const postLabel = post.isSponsored ? 'Market offer' : post.tag || 'Field note';
  const textFromBlocks =
    post.bodyBlocks
      ?.filter((block) => block.type === 'paragraph')
      .map((block) => block.text)
      .join('\n\n') || post.body;
  const bodyPreview = textFromBlocks.length > 360 ? `${textFromBlocks.slice(0, 360).trim()}...` : textFromBlocks;
  const paragraphs = bodyPreview
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
  const inlineMedia = post.bodyBlocks?.find(
    (block): block is MediaBlock => (block.type === 'image' || block.type === 'video') && 'url' in block
  );
  const previewMedia = inlineMedia
    ? [{ type: inlineMedia.type, url: inlineMedia.url, thumbnailUrl: inlineMedia.thumbnailUrl }]
    : post.media;

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 5) * 35).duration(320)}
      style={[styles.postShell, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={styles.storyRail}>
        <View style={[styles.storyTypePill, { backgroundColor: `${palette.tint}14` }]}>
          <Text style={[styles.storyTypeText, { color: palette.tint }]}>{postLabel}</Text>
        </View>
        <Text style={[styles.storyTime, { color: palette.muted }]}>{formatRelativeTime(post.createdAt)}</Text>
      </View>

      <View style={styles.postTopRow}>
        <Pressable onPress={() => onOpenAuthor(post)} style={styles.postIdentity}>
          <SocialAvatar name={post.author.name} imageUrl={post.author.avatarUrl} size={38} />
          <View style={styles.postIdentityText}>
            <View style={styles.postNameRow}>
              <Text style={[styles.postAuthor, { color: palette.text }]}>{post.author.name}</Text>
              {post.author.verificationStatus === 'top-rated' ? (
                <Ionicons name="checkmark-circle" size={14} color={palette.tint} />
              ) : null}
            </View>
            <Text style={[styles.postMeta, { color: palette.muted }]}>
              {post.author.role} | {post.location}
            </Text>
          </View>
        </Pressable>
      </View>

      <Pressable onPress={() => onOpenPost(post._id)} style={styles.postCopy}>
        <Text style={[styles.postHeadline, { color: palette.text }]}>{post.headline}</Text>
        {paragraphs.slice(0, 2).map((paragraph, paragraphIndex) => (
          <Text key={`${post._id}-p-${paragraphIndex}`} style={[styles.postBody, { color: palette.text }]}>
            {paragraph}
          </Text>
        ))}
        {textFromBlocks.length > 360 ? <Text style={[styles.readMoreText, { color: palette.tint }]}>Read full note</Text> : null}
      </Pressable>

      {linkedProduct ? (
        <Pressable
          onPress={() => onOpenLinkedProduct(linkedProduct._id)}
          style={[styles.linkedListingCard, { backgroundColor: palette.surface }]}>
          <View style={styles.linkedListingCopy}>
            <Text style={[styles.linkedListingLabel, { color: palette.tint }]}>Tagged listing</Text>
            <Text style={[styles.linkedListingName, { color: palette.text }]}>{linkedProduct.name}</Text>
            <Text style={[styles.linkedListingMeta, { color: palette.muted }]}>
              KES {linkedProduct.price} / {linkedProduct.unit} | {linkedProduct.location}
            </Text>
          </View>
          <Feather name="arrow-up-right" size={16} color={palette.muted} />
        </Pressable>
      ) : null}

      {previewMedia?.length ? (
        <View style={styles.mediaWrap}>
          <FeedMedia
            media={previewMedia}
            onToggleLike={() => onToggleLike(post._id)}
            onOpenPost={() => onOpenPost(post._id)}
            allowPlayback={isFocused && isVisible}
            playbackPositions={playbackPositions}
            onPlaybackTimeChange={onPlaybackTimeChange}
          />
        </View>
      ) : null}

      <View style={[styles.postFooter, { borderTopColor: palette.border }]}>
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

const styles = StyleSheet.create({
  postShell: { gap: 12, padding: 14, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth },
  storyRail: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  storyTypePill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  storyTypeText: { fontFamily: Fonts.rounded, fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },
  storyTime: { fontFamily: Fonts.sans, fontSize: 12 },
  postTopRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' },
  postIdentity: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  postIdentityText: { flex: 1, gap: 2 },
  postNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  postAuthor: { fontFamily: Fonts.rounded, fontSize: 14, fontWeight: '700' },
  postMeta: { fontFamily: Fonts.sans, fontSize: 12 },
  postCopy: { gap: 9 },
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
  linkedListingLabel: {
    fontFamily: Fonts.rounded,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  linkedListingName: { fontFamily: Fonts.rounded, fontSize: 14, fontWeight: '700' },
  linkedListingMeta: { fontFamily: Fonts.sans, fontSize: 12, lineHeight: 18 },
  postHeadline: { fontFamily: Fonts.rounded, fontSize: 21, fontWeight: '800', lineHeight: 27 },
  postBody: { fontFamily: Fonts.sans, fontSize: 15, lineHeight: 23 },
  readMoreText: { fontFamily: Fonts.rounded, fontSize: 13, fontWeight: '800' },
  mediaWrap: { maxHeight: 360, overflow: 'hidden', borderRadius: 20 },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
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
});
