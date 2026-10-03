import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/ui/avatar';
import { MoreButton } from '@/components/ui/more-button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { FeedPost } from '@/lib/types';
import { describeUser, openProfile } from '@/utils/user';

type PostAuthorRowProps = {
  post: FeedPost;
  /** Extra text after role and location, e.g. relative time. */
  meta?: string;
  onToggleFollow?: () => void;
  onMore?: () => void;
};

export function PostAuthorRow({ post, meta, onToggleFollow, onMore }: PostAuthorRowProps) {
  const { colors } = useTheme();
  const { author } = post;
  const canFollow = !post.isOwner && post.canFollowAuthor && onToggleFollow;
  const isVerified = author.verificationStatus === 'verified' || author.verificationStatus === 'top-rated';

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View ${author.name}'s profile`}
        onPress={() => openProfile(author)}
        style={styles.identity}>
        <Avatar name={author.name} imageUrl={author.avatarUrl} size={40} />
        <View style={styles.copy}>
          <View style={styles.nameRow}>
            <AppText variant="label" numberOfLines={1} style={styles.name}>
              {author.name}
            </AppText>
            {isVerified ? <Ionicons name="checkmark-circle" size={14} color={colors.primary} accessibilityLabel="Verified" /> : null}
          </View>
          <AppText variant="caption" color="textMuted" numberOfLines={1}>
            {describeUser({ role: author.role, location: post.location || author.location }, meta)}
          </AppText>
        </View>
      </Pressable>
      {canFollow ? (
        <Pressable accessibilityRole="button" onPress={onToggleFollow} hitSlop={8} style={styles.follow}>
          <AppText variant="label" color={post.isFollowingAuthor ? 'textMuted' : 'primary'}>
            {post.isFollowingAuthor ? 'Following' : 'Follow'}
          </AppText>
        </Pressable>
      ) : null}
      {onMore ? <MoreButton onPress={onMore} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  identity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  copy: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { flexShrink: 1 },
  follow: { paddingHorizontal: Spacing.xxs, paddingVertical: Spacing.xxs },
});
