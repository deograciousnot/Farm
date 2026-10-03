import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { FeedMedia } from '@/components/feed/feed-media';
import { LinkedListingCard } from '@/components/feed/linked-listing-card';
import { PostAuthorRow } from '@/components/feed/post-author-row';
import { AppText } from '@/components/ui/app-text';
import { Badge } from '@/components/ui/badge';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { FeedPost } from '@/lib/types';
import { formatRelativeTime } from '@/utils/format';

const PREVIEW_LENGTH = 280;

type FeedPostCardProps = {
  post: FeedPost;
  onToggleLike: (post: FeedPost) => void;
  onToggleSave: (post: FeedPost) => void;
  onToggleFollow: (post: FeedPost) => void;
  onOpenComments: (post: FeedPost) => void;
  onReport: (post: FeedPost) => void;
};

export function getPostText(post: FeedPost) {
  return (
    post.bodyBlocks
      ?.filter((block) => block.type === 'paragraph')
      .map((block) => block.text)
      .join('\n\n') || post.body
  );
}

export function getPostMedia(post: FeedPost) {
  const inline = post.bodyBlocks?.filter(
    (block): block is Extract<NonNullable<FeedPost['bodyBlocks']>[number], { url: string }> => block.type !== 'paragraph'
  );

  return inline?.length ? inline.map(({ type, url, thumbnailUrl }) => ({ type, url, thumbnailUrl })) : (post.media ?? []);
}

export const FeedPostCard = memo(function FeedPostCard({
  post,
  onToggleLike,
  onToggleSave,
  onToggleFollow,
  onOpenComments,
  onReport,
}: FeedPostCardProps) {
  const { colors } = useTheme();
  const text = getPostText(post);
  const isTruncated = text.length > PREVIEW_LENGTH;
  const preview = isTruncated ? `${text.slice(0, PREVIEW_LENGTH).trimEnd()}…` : text;
  const media = getPostMedia(post);
  const latestComment = post.recentComments[0];

  function openPost() {
    router.push({ pathname: '/post/[id]', params: { id: post._id } });
  }

  return (
    <View style={styles.card}>
      <PostAuthorRow
        post={post}
        meta={formatRelativeTime(post.createdAt)}
        onToggleFollow={() => onToggleFollow(post)}
        onMore={() => onReport(post)}
      />

      <Pressable onPress={openPost} style={styles.copy} accessibilityRole="link" accessibilityHint="Opens the full post">
        <Badge label={post.isSponsored ? 'Market offer' : post.tag || 'Field note'} tone={post.isSponsored ? 'accent' : 'primary'} />
        <AppText variant="headline">{post.headline}</AppText>
        <AppText variant="body" color="textMuted">
          {preview}
        </AppText>
        {isTruncated ? (
          <AppText variant="label" color="primary">
            Read more
          </AppText>
        ) : null}
      </Pressable>

      {media.length ? <FeedMedia media={media} onOpen={openPost} /> : null}

      {post.linkedProduct ? <LinkedListingCard product={post.linkedProduct} /> : null}

      <View style={styles.actions}>
        <ActionButton
          icon={post.hasLiked ? 'heart' : 'heart-outline'}
          label={String(post.likesCount)}
          color={post.hasLiked ? colors.like : colors.textMuted}
          accessibilityLabel={post.hasLiked ? 'Unlike' : 'Like'}
          onPress={() => onToggleLike(post)}
        />
        <ActionButton
          icon="chatbubble-outline"
          label={String(post.commentsCount)}
          color={colors.textMuted}
          accessibilityLabel="Comments"
          onPress={() => onOpenComments(post)}
        />
        <View style={styles.spacer} />
        <ActionButton
          icon={post.hasSaved ? 'bookmark' : 'bookmark-outline'}
          color={post.hasSaved ? colors.primary : colors.textMuted}
          accessibilityLabel={post.hasSaved ? 'Remove from saved' : 'Save'}
          onPress={() => onToggleSave(post)}
        />
      </View>

      {latestComment ? (
        <Pressable onPress={() => onOpenComments(post)} style={styles.commentPreview}>
          <AppText variant="callout" color="textMuted" numberOfLines={2}>
            <AppText variant="label">{latestComment.author.name} </AppText>
            {latestComment.body}
          </AppText>
          {post.commentsCount > 1 ? (
            <AppText variant="caption" color="textSubtle">
              View all {post.commentsCount} comments
            </AppText>
          ) : null}
        </Pressable>
      ) : null}
    </View>
  );
});

function ActionButton({
  icon,
  label,
  color,
  accessibilityLabel,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label?: string;
  color: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
      <Ionicons name={icon} size={21} color={color} />
      {label ? (
        <AppText variant="label" style={{ color }}>
          {label}
        </AppText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.sm, paddingVertical: Spacing.lg },
  copy: { gap: Spacing.xs },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32 },
  pressed: { opacity: 0.6 },
  spacer: { flex: 1 },
  commentPreview: { gap: Spacing.xxs },
});
