import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MoreButton } from '@/components/ui/more-button';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { CommunityThread } from '@/lib/types';
import { formatRelativeTime, pluralize } from '@/utils/format';
import { describeUser } from '@/utils/user';

type ThreadCardProps = {
  thread: CommunityThread;
  onReport: (thread: CommunityThread) => void;
};

export const ThreadCard = memo(function ThreadCard({ thread, onReport }: ThreadCardProps) {
  const { colors } = useTheme();
  const thumbnail = thread.media?.[0];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/community/[id]', params: { id: thread._id } })}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.topRow}>
        <View style={styles.badges}>
          <Badge label={thread.category} tone="primary" />
          {thread.isPinned ? <Badge label="Pinned" tone="accent" icon="bookmark" /> : null}
        </View>
        <MoreButton label="Report discussion" onPress={() => onReport(thread)} />
      </View>

      <View style={styles.body}>
        <View style={styles.copy}>
          <AppText variant="subhead" numberOfLines={3}>
            {thread.title}
          </AppText>
          {thread.preview ? (
            <AppText variant="callout" color="textMuted" numberOfLines={2}>
              {thread.preview}
            </AppText>
          ) : null}
        </View>
        {thumbnail ? (
          <Image source={{ uri: thumbnail.thumbnailUrl || thumbnail.url }} contentFit="cover" transition={150} style={styles.thumb} />
        ) : null}
      </View>

      <View style={styles.footer}>
        <Avatar name={thread.author.name} imageUrl={thread.author.avatarUrl} size={24} />
        <AppText variant="caption" color="textMuted" numberOfLines={1} style={styles.author}>
          {thread.author.name} · {describeUser(thread.author, formatRelativeTime(thread.createdAt))}
        </AppText>
        <View style={styles.stat}>
          <Feather name="message-circle" size={14} color={thread.repliesCount ? colors.primary : colors.textSubtle} />
          <AppText variant="caption" color={thread.repliesCount ? 'primary' : 'textSubtle'}>
            {thread.repliesCount ? pluralize(thread.repliesCount, 'answer') : 'Unanswered'}
          </AppText>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: { gap: Spacing.xs, paddingVertical: Spacing.md },
  pressed: { opacity: 0.7 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badges: { flexDirection: 'row', gap: 6 },
  body: { flexDirection: 'row', gap: Spacing.sm },
  copy: { flex: 1, gap: Spacing.xxs },
  thumb: { width: 72, height: 72, borderRadius: Radius.md },
  footer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.xxs },
  author: { flex: 1 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
