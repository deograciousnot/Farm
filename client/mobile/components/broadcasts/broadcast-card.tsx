import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { IconButton } from '@/components/ui/icon-button';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Broadcast, BroadcastCategory } from '@/lib/types';
import { formatRelativeTime } from '@/utils/format';

export const broadcastCategories: Record<BroadcastCategory, { label: string; tone: BadgeTone; icon: keyof typeof Feather.glyphMap }> = {
  advisory: { label: 'Advisory', tone: 'primary', icon: 'book-open' },
  'pest-alert': { label: 'Pest alert', tone: 'danger', icon: 'alert-triangle' },
  weather: { label: 'Weather', tone: 'accent', icon: 'cloud-rain' },
  market: { label: 'Market', tone: 'accent', icon: 'trending-up' },
  program: { label: 'Programme', tone: 'primary', icon: 'gift' },
  training: { label: 'Training', tone: 'primary', icon: 'award' },
};

/** "Nakuru, Kiambu" or "All of Kenya" — who an update was meant for. */
export function describeAudience(broadcast: Pick<Broadcast, 'counties' | 'roles'>) {
  const where = broadcast.counties.length ? broadcast.counties.join(', ') : 'all of Kenya';
  const who = broadcast.roles.length ? broadcast.roles.map((role) => `${role}s`).join(' and ') : 'everyone';
  return `For ${who} in ${where}`;
}

export function PublisherRow({ broadcast, size = 'sm' }: { broadcast: Broadcast; size?: 'sm' | 'md' }) {
  const { colors } = useTheme();
  const iconSize = size === 'md' ? 40 : 28;

  return (
    <View style={styles.publisher}>
      <View style={[styles.publisherIcon, { width: iconSize, height: iconSize, backgroundColor: colors.primary }]}>
        <Feather name="shield" size={iconSize * 0.48} color={colors.onPrimary} />
      </View>
      <View style={styles.publisherCopy}>
        <View style={styles.nameRow}>
          <AppText variant="label" numberOfLines={1} style={styles.name}>
            {broadcast.organization.name}
          </AppText>
          <Feather name="check-circle" size={13} color={colors.primary} accessibilityLabel="Verified organisation" />
        </View>
        <AppText variant="caption" color="textMuted">
          Official update · {formatRelativeTime(broadcast.publishedAt)}
        </AppText>
      </View>
    </View>
  );
}

type BroadcastCardProps = {
  broadcast: Broadcast;
  /** Shows a close button that hides the update from Home. */
  onDismiss?: (broadcast: Broadcast) => void;
  /** Marks updates the member hasn't opened yet. */
  showUnread?: boolean;
};

export const BroadcastCard = memo(function BroadcastCard({ broadcast, onDismiss, showUnread = false }: BroadcastCardProps) {
  const category = broadcastCategories[broadcast.category] ?? broadcastCategories.advisory;

  return (
    <Card tone="surface" onPress={() => router.push({ pathname: '/broadcast/[id]', params: { id: broadcast._id } })} style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.flex}>
          <PublisherRow broadcast={broadcast} />
        </View>
        {onDismiss ? <IconButton icon="x" label="Hide from Home" variant="plain" size={32} color="textSubtle" onPress={() => onDismiss(broadcast)} /> : null}
      </View>
      <View style={styles.badges}>
        <Badge label={category.label} tone={category.tone} icon={category.icon} />
        {showUnread && broadcast.isRead === false ? <Badge label="New" tone="primary" /> : null}
      </View>
      <AppText variant="subhead" numberOfLines={2}>
        {broadcast.title}
      </AppText>
      <AppText variant="callout" color="textMuted" numberOfLines={2}>
        {broadcast.body}
      </AppText>
    </Card>
  );
});

const styles = StyleSheet.create({
  card: { gap: Spacing.xs },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs },
  flex: { flex: 1 },
  badges: { flexDirection: 'row', gap: 6 },
  publisher: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  publisherIcon: { borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  publisherCopy: { flex: 1, gap: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { flexShrink: 1 },
});
