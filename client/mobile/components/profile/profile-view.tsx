import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ListRow } from '@/components/ui/list-row';
import { Section } from '@/components/ui/section';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { EmptyState } from '@/components/ui/state-views';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { FeedPost, Product, ProfileResponse } from '@/lib/types';
import { formatCurrency, formatRelativeTime } from '@/utils/format';
import { describeUser, openProfile } from '@/utils/user';

type ProfileTab = 'posts' | 'listings' | 'followers' | 'following';

type ProfileViewProps = {
  data: ProfileResponse;
  onToggleFollow?: () => void;
  isFollowPending?: boolean;
  /** Rendered between the header and the tabs, e.g. a notifications row. */
  children?: React.ReactNode;
};

export function shareProfile(profile: ProfileResponse['profile']) {
  const location = profile.location ? ` in ${profile.location}` : '';
  void Share.share({ message: `Connect with ${profile.name}${location} on FarmConnect — farmers learning from farmers.` });
}

export function ProfileView({ data, onToggleFollow, isFollowPending, children }: ProfileViewProps) {
  const { colors } = useTheme();
  const { profile, metrics, socialGraph, remarks } = data;
  const isFarmer = profile.role === 'farmer' || data.listings.length > 0;
  const [tab, setTab] = useState<ProfileTab>('posts');
  const isVerified = profile.verificationStatus === 'verified' || profile.verificationStatus === 'top-rated';
  const followers = profile.followersCount ?? socialGraph.followers.length;
  const following = profile.followingCount ?? socialGraph.following.length;
  const averageRating = remarks.received.length
    ? remarks.received.reduce((sum, remark) => sum + remark.rating, 0) / remarks.received.length
    : null;

  const tabs = [
    { value: 'posts', label: 'Posts' },
    ...(isFarmer ? [{ value: 'listings' as const, label: 'Listings' }] : []),
    { value: 'followers', label: 'Followers' },
    { value: 'following', label: 'Following' },
  ] as { value: ProfileTab; label: string }[];

  return (
    <View style={styles.wrap}>
      <View style={styles.identity}>
        <Avatar name={profile.name} imageUrl={profile.avatarUrl} size={72} />
        <View style={styles.identityCopy}>
          <View style={styles.nameRow}>
            <AppText variant="title" numberOfLines={2} style={styles.name}>
              {profile.name}
            </AppText>
            {isVerified ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} accessibilityLabel="Verified" /> : null}
          </View>
          <AppText variant="callout" color="textMuted">
            {describeUser(profile)}
          </AppText>
        </View>
      </View>

      {profile.bio ? <AppText variant="body">{profile.bio}</AppText> : null}

      <View style={[styles.stats, { borderColor: colors.border }]}>
        <Stat value={metrics.posts} label="Posts" onPress={() => setTab('posts')} />
        <Stat value={followers} label="Followers" onPress={() => setTab('followers')} />
        <Stat value={following} label="Following" onPress={() => setTab('following')} />
        <Stat value={profile.trustScore?.toFixed(1) ?? '0.0'} label="Trust" icon="shield" />
      </View>

      <View style={styles.actions}>
        {socialGraph.isOwner ? (
          <Button label="Edit profile" variant="secondary" icon="edit-2" onPress={() => router.push('/profile/edit')} style={styles.flex} />
        ) : (
          <Button
            label={socialGraph.isFollowing ? 'Following' : 'Follow'}
            variant={socialGraph.isFollowing ? 'secondary' : 'primary'}
            icon={socialGraph.isFollowing ? 'user-check' : 'user-plus'}
            onPress={onToggleFollow}
            loading={isFollowPending}
            style={styles.flex}
          />
        )}
        <Button label="Share" variant="secondary" icon="share-2" onPress={() => shareProfile(profile)} style={styles.flex} />
      </View>

      {children}

      {remarks.received.length ? (
        <Section title="Reviews from buyers">
          <View style={styles.ratingSummary}>
            <Ionicons name="star" size={18} color={colors.accent} />
            <AppText variant="subhead">{averageRating?.toFixed(1)}</AppText>
            <AppText variant="callout" color="textMuted">
              from {remarks.received.length} {remarks.received.length === 1 ? 'order' : 'orders'}
            </AppText>
          </View>
          {remarks.received.slice(0, 3).map((remark) => (
            <Card key={remark._id}>
              <View style={styles.remarkHeader}>
                <Avatar name={remark.buyer.name} imageUrl={remark.buyer.avatarUrl} size={28} />
                <AppText variant="label" style={styles.flex} numberOfLines={1}>
                  {remark.buyer.name}
                </AppText>
                <View style={styles.stars}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Ionicons key={value} name={value <= remark.rating ? 'star' : 'star-outline'} size={12} color={colors.accent} />
                  ))}
                </View>
              </View>
              <AppText variant="callout">{remark.body}</AppText>
            </Card>
          ))}
        </Section>
      ) : null}

      <SegmentedControl options={tabs} value={tab} onChange={setTab} />

      <View style={styles.tabContent}>
        {tab === 'posts' ? (
          data.posts.length ? (
            data.posts.map((post) => <PostRow key={post._id} post={post} />)
          ) : (
            <EmptyState icon="feather" title="No posts yet" body={socialGraph.isOwner ? 'Share a field note — your experience could help another farmer.' : undefined} />
          )
        ) : null}
        {tab === 'listings' ? (
          data.listings.length ? (
            data.listings.map((listing) => <ListingRow key={listing._id} listing={listing} />)
          ) : (
            <EmptyState icon="shopping-bag" title="No listings yet" />
          )
        ) : null}
        {tab === 'followers' || tab === 'following' ? (
          (tab === 'followers' ? socialGraph.followers : socialGraph.following).length ? (
            (tab === 'followers' ? socialGraph.followers : socialGraph.following).map((person) => (
              <ListRow
                key={person._id ?? person.id ?? person.name}
                avatar={{ name: person.name, imageUrl: person.avatarUrl }}
                title={person.name}
                subtitle={describeUser(person)}
                onPress={() => openProfile(person)}
              />
            ))
          ) : (
            <EmptyState icon="users" title={tab === 'followers' ? 'No followers yet' : 'Not following anyone yet'} />
          )
        ) : null}
      </View>
    </View>
  );
}

function Stat({ value, label, icon, onPress }: { value: number | string; label: string; icon?: keyof typeof Feather.glyphMap; onPress?: () => void }) {
  const { colors } = useTheme();

  return (
    <Pressable accessibilityRole={onPress ? 'button' : undefined} onPress={onPress} disabled={!onPress} style={styles.stat}>
      <View style={styles.statValue}>
        {icon ? <Feather name={icon} size={14} color={colors.primary} /> : null}
        <AppText variant="headline">{value}</AppText>
      </View>
      <AppText variant="caption" color="textMuted">
        {label}
      </AppText>
    </Pressable>
  );
}

function PostRow({ post }: { post: FeedPost }) {
  const { colors } = useTheme();
  const cover = post.media?.[0];
  const coverUri = cover ? (cover.type === 'video' ? cover.thumbnailUrl : cover.url) : undefined;

  return (
    <Card onPress={() => router.push({ pathname: '/post/[id]', params: { id: post._id } })} style={styles.row}>
      <View style={styles.flex}>
        <AppText variant="label" numberOfLines={2}>
          {post.headline}
        </AppText>
        <AppText variant="caption" color="textMuted">
          {formatRelativeTime(post.createdAt)} · {post.likesCount} likes · {post.commentsCount} comments
        </AppText>
      </View>
      {coverUri ? (
        <Image source={{ uri: coverUri }} contentFit="cover" style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: colors.surfaceMuted }]}>
          <Feather name="file-text" size={18} color={colors.textSubtle} />
        </View>
      )}
    </Card>
  );
}

function ListingRow({ listing }: { listing: Product }) {
  const { colors } = useTheme();
  const image = listing.mediaUrls?.[0];

  return (
    <Card onPress={() => router.push({ pathname: '/product/[id]', params: { id: listing._id } })} style={styles.row}>
      {image ? (
        <Image source={{ uri: image }} contentFit="cover" style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: colors.surfaceMuted }]}>
          <Feather name="package" size={18} color={colors.textSubtle} />
        </View>
      )}
      <View style={styles.flex}>
        <AppText variant="label" numberOfLines={1}>
          {listing.name}
        </AppText>
        <AppText variant="caption" color="textMuted">
          {formatCurrency(listing.price)} / {listing.unit} · {listing.stock} in stock
        </AppText>
      </View>
      {listing.stock <= 0 ? <Badge label="Sold out" tone="danger" /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.lg },
  flex: { flex: 1 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  identityCopy: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flexShrink: 1 },
  stats: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actions: { flexDirection: 'row', gap: Spacing.xs },
  ratingSummary: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  remarkHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  stars: { flexDirection: 'row', gap: 1 },
  tabContent: { gap: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', padding: Spacing.sm },
  thumb: { width: 56, height: 56, borderRadius: Radius.md },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
});
