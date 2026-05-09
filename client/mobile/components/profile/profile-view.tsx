import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SocialAvatar } from '@/components/social-avatar';
import { Colors, Fonts } from '@/constants/theme';
import type { FeedPost, Product, ProfileResponse } from '@/lib/types';

type ProfileTab = 'posts' | 'listings' | 'followers' | 'following';

type ProfileViewProps = {
  palette: (typeof Colors)['light'] | (typeof Colors)['dark'];
  profileData: ProfileResponse;
  activeTab: ProfileTab;
  onChangeTab: (tab: ProfileTab) => void;
  onEditProfile?: () => void;
  onShareProfile?: () => void;
  onLogoutMenu?: () => void;
  onToggleFollow?: () => void;
  onDeletePost?: (postId: string) => void;
  processingPostId?: string | null;
  processingFollow?: boolean;
  showNotifications?: boolean;
  notificationsSlot?: React.ReactNode;
};

export function ProfileView({
  palette,
  profileData,
  activeTab,
  onChangeTab,
  onEditProfile,
  onShareProfile,
  onLogoutMenu,
  onToggleFollow,
  onDeletePost,
  processingPostId,
  processingFollow,
  showNotifications,
  notificationsSlot,
}: ProfileViewProps) {
  const { profile, metrics, socialGraph } = profileData;

  const tabs: { key: ProfileTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'posts', label: 'Posts', icon: 'grid-outline' },
    { key: 'listings', label: 'Listings', icon: 'basket-outline' },
    { key: 'followers', label: 'Followers', icon: 'people-outline' },
    { key: 'following', label: 'Following', icon: 'repeat-outline' },
  ];

  return (
    <>
      <View style={[styles.hero, { backgroundColor: palette.backgroundSecondary }]}>
        <View style={[styles.heroGlowLarge, { backgroundColor: `${palette.tint}16` }]} />
        <View style={[styles.heroGlowSmall, { backgroundColor: `${palette.accent}15` }]} />

        <View style={styles.topRow}>
          <View style={styles.identityRow}>
            <SocialAvatar name={profile.name} imageUrl={profile.avatarUrl} size={88} />
            <View style={styles.identityText}>
              <Text style={[styles.profileName, { color: palette.text }]}>{profile.name}</Text>
              <Text style={[styles.profileHandle, { color: palette.muted }]}>@{profile.name.toLowerCase().replace(/\s+/g, '')}</Text>
              <Text style={[styles.profileMeta, { color: palette.muted }]}>
                {profile.role} - {profile.location}
              </Text>
            </View>
          </View>

          {onLogoutMenu ? (
            <Pressable onPress={onLogoutMenu} hitSlop={8} style={[styles.topIconButton, { backgroundColor: palette.surface }]}>
              <Feather name="menu" size={18} color={palette.text} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.statsRow}>
          <StatBlock label="Posts" value={metrics.posts} palette={palette} onPress={() => onChangeTab('posts')} />
          <StatBlock
            label="Followers"
            value={profile.followersCount ?? socialGraph.followers.length}
            palette={palette}
            onPress={() => onChangeTab('followers')}
          />
          <StatBlock
            label="Following"
            value={profile.followingCount ?? socialGraph.following.length}
            palette={palette}
            onPress={() => onChangeTab('following')}
          />
        </View>

        <Text style={[styles.bio, { color: palette.text }]}>
          {profile.bio || 'Building a trusted presence in the FarmConnect community.'}
        </Text>

        <View style={styles.trustRow}>
          <Text style={[styles.trustPill, { color: palette.success, backgroundColor: `${palette.success}14` }]}>
            Trust {profile.trustScore?.toFixed(1) ?? '0.0'}
          </Text>
          <Text style={[styles.trustPill, { color: palette.tint, backgroundColor: `${palette.tint}14` }]}>
            {profile.verificationStatus || 'active'}
          </Text>
        </View>

        <View style={styles.actionRow}>
          {socialGraph.isOwner ? (
            <>
              <Pressable onPress={onEditProfile} style={[styles.actionButton, { backgroundColor: palette.surface }]}>
                <Text style={[styles.actionButtonText, { color: palette.text }]}>Edit profile</Text>
              </Pressable>
              <Pressable onPress={onShareProfile} style={[styles.actionButton, { backgroundColor: palette.surface }]}>
                <Text style={[styles.actionButtonText, { color: palette.text }]}>Share profile</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                onPress={onToggleFollow}
                style={[styles.actionButton, { backgroundColor: socialGraph.isFollowing ? palette.surface : palette.tint }]}>
                <Text style={[styles.actionButtonText, { color: socialGraph.isFollowing ? palette.text : '#ffffff' }]}>
                  {processingFollow ? 'Updating...' : socialGraph.isFollowing ? 'Following' : 'Follow'}
                </Text>
              </Pressable>
              <Pressable onPress={onShareProfile} style={[styles.actionButton, { backgroundColor: palette.surface }]}>
                <Text style={[styles.actionButtonText, { color: palette.text }]}>Share profile</Text>
              </Pressable>
            </>
          )}
        </View>

        <View style={styles.tabRow}>
          {tabs.map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => onChangeTab(tab.key)}
              style={[
                styles.tabButton,
                { borderBottomColor: activeTab === tab.key ? palette.text : 'transparent' },
              ]}>
              <Ionicons name={tab.icon} size={18} color={activeTab === tab.key ? palette.text : palette.muted} />
              <Text style={[styles.tabLabel, { color: activeTab === tab.key ? palette.text : palette.muted }]}>{tab.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.contentSection}>
        {activeTab === 'posts'
          ? profileData.posts.length
            ? (
              <View style={styles.listSection}>
                {profileData.posts.map((post) => (
                  <PostRow
                    key={post._id}
                    post={post}
                    palette={palette}
                    canDelete={socialGraph.isOwner}
                    isDeleting={processingPostId === post._id}
                    onDelete={onDeletePost}
                  />
                ))}
              </View>
            )
            : <EmptyBlock title="No posts yet" body="When posts land, they'll appear here in a cleaner profile archive." palette={palette} />
          : null}

        {activeTab === 'listings'
          ? profileData.listings.length
            ? (
              <View style={styles.listSection}>
                {profileData.listings.map((listing) => (
                  <ListingRow key={listing._id} listing={listing} palette={palette} />
                ))}
              </View>
            )
            : <EmptyBlock title="No listings yet" body="Marketplace items from this profile will show up here." palette={palette} />
          : null}

        {activeTab === 'followers'
          ? profileData.socialGraph.followers.length
            ? (
              <View style={styles.listSection}>
                {profileData.socialGraph.followers.map((user) => (
                  <UserRow key={user._id ?? user.id ?? user.name} user={user} palette={palette} />
                ))}
              </View>
            )
            : <EmptyBlock title="No followers yet" body="Followers will appear here as this profile grows." palette={palette} />
          : null}

        {activeTab === 'following'
          ? profileData.socialGraph.following.length
            ? (
              <View style={styles.listSection}>
                {profileData.socialGraph.following.map((user) => (
                  <UserRow key={user._id ?? user.id ?? user.name} user={user} palette={palette} />
                ))}
              </View>
            )
            : <EmptyBlock title="Not following anyone yet" body="Accounts followed from the feed or profile will be listed here." palette={palette} />
          : null}
      </View>

      {showNotifications ? notificationsSlot : null}
    </>
  );
}

function StatBlock({
  label,
  value,
  palette,
  onPress,
}: {
  label: string;
  value: number;
  palette: (typeof Colors)['light'] | (typeof Colors)['dark'];
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.statBlock}>
      <Text style={[styles.statValue, { color: palette.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: palette.muted }]}>{label}</Text>
    </Pressable>
  );
}

function EmptyBlock({
  title,
  body,
  palette,
}: {
  title: string;
  body: string;
  palette: (typeof Colors)['light'] | (typeof Colors)['dark'];
}) {
  return (
    <View style={[styles.emptyBlock, { backgroundColor: palette.surface }]}>
      <Text style={[styles.emptyTitle, { color: palette.text }]}>{title}</Text>
      <Text style={[styles.emptyBody, { color: palette.muted }]}>{body}</Text>
    </View>
  );
}

function PostRow({
  post,
  palette,
  canDelete,
  isDeleting,
  onDelete,
}: {
  post: FeedPost;
  palette: (typeof Colors)['light'] | (typeof Colors)['dark'];
  canDelete?: boolean;
  isDeleting?: boolean;
  onDelete?: (postId: string) => void;
}) {
  const cover = post.media?.[0];

  return (
    <Pressable onPress={() => router.push({ pathname: '/post/[id]', params: { id: post._id } })} style={[styles.cardRow, { backgroundColor: palette.surface }]}>
      <View style={styles.cardCopy}>
        <Text numberOfLines={2} style={[styles.cardTitle, { color: palette.text }]}>{post.headline}</Text>
        <Text numberOfLines={2} style={[styles.cardBody, { color: palette.muted }]}>{post.body}</Text>
        <Text style={[styles.cardMeta, { color: palette.muted }]}>
          {post.likesCount} likes - {post.commentsCount} comments
        </Text>
      </View>

      <View style={[styles.cardThumb, { backgroundColor: palette.backgroundSecondary }]}>
        {cover ? (
          <>
            <SocialAvatar name={post.author.name} imageUrl={cover.type === 'image' ? cover.url : post.author.avatarUrl} size={62} />
            {cover.type === 'video' ? (
              <View style={[styles.videoBadge, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
                <Ionicons name="play" size={12} color="#ffffff" />
              </View>
            ) : null}
          </>
        ) : (
          <Ionicons name="document-text-outline" size={20} color={palette.muted} />
        )}
      </View>

      {canDelete && onDelete ? (
        <Pressable onPress={() => onDelete(post._id)} hitSlop={8} style={styles.deleteButton}>
          <Feather name={isDeleting ? 'loader' : 'trash-2'} size={16} color={palette.muted} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

function ListingRow({
  listing,
  palette,
}: {
  listing: Product;
  palette: (typeof Colors)['light'] | (typeof Colors)['dark'];
}) {
  return (
    <Pressable onPress={() => router.push({ pathname: '/product/[id]', params: { id: listing._id } })} style={[styles.cardRow, { backgroundColor: palette.surface }]}>
      <View style={styles.cardCopy}>
        <Text numberOfLines={2} style={[styles.cardTitle, { color: palette.text }]}>{listing.name}</Text>
        <Text numberOfLines={2} style={[styles.cardBody, { color: palette.muted }]}>{listing.description}</Text>
        <Text style={[styles.cardMeta, { color: palette.tint }]}>KES {listing.price} / {listing.unit}</Text>
      </View>
      <View style={[styles.cardThumb, { backgroundColor: palette.backgroundSecondary }]}>
        <Ionicons name="basket-outline" size={20} color={palette.text} />
      </View>
    </Pressable>
  );
}

function UserRow({
  user,
  palette,
}: {
  user: ProfileResponse['socialGraph']['followers'][number];
  palette: (typeof Colors)['light'] | (typeof Colors)['dark'];
}) {
  const userId = user._id ?? user.id;

  return (
    <Pressable
      onPress={() => {
        if (userId) {
          router.push({ pathname: '/profile/[id]', params: { id: userId } });
        }
      }}
      style={[styles.userRow, { backgroundColor: palette.surface }]}>
      <SocialAvatar name={user.name} imageUrl={user.avatarUrl} size={46} />
      <View style={styles.userCopy}>
        <Text style={[styles.userName, { color: palette.text }]}>{user.name}</Text>
        <Text style={[styles.userMeta, { color: palette.muted }]}>{user.role} - {user.location}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={palette.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 30, padding: 18, gap: 14, overflow: 'hidden' },
  heroGlowLarge: { position: 'absolute', width: 180, height: 180, borderRadius: 999, right: -40, top: -56 },
  heroGlowSmall: { position: 'absolute', width: 120, height: 120, borderRadius: 999, left: -18, bottom: -30 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  identityRow: { flexDirection: 'row', gap: 14, flex: 1 },
  identityText: { flex: 1, paddingTop: 4 },
  topIconButton: { width: 38, height: 38, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  profileName: { fontFamily: Fonts.rounded, fontSize: 28, fontWeight: '700' },
  profileHandle: { fontFamily: Fonts.sans, fontSize: 13, marginTop: 2 },
  profileMeta: { fontFamily: Fonts.sans, fontSize: 13, marginTop: 4, textTransform: 'capitalize' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  statBlock: { flex: 1, gap: 4 },
  statValue: { fontFamily: Fonts.rounded, fontSize: 24, fontWeight: '700' },
  statLabel: { fontFamily: Fonts.sans, fontSize: 12 },
  bio: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 21 },
  trustRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  trustPill: {
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontFamily: Fonts.rounded,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionButton: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  actionButtonText: { fontFamily: Fonts.rounded, fontSize: 13, fontWeight: '700' },
  tabRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingTop: 4 },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingBottom: 10,
    borderBottomWidth: 2,
  },
  tabLabel: { fontFamily: Fonts.rounded, fontSize: 11, fontWeight: '700' },
  contentSection: { gap: 12 },
  listSection: { gap: 10 },
  emptyBlock: { borderRadius: 22, padding: 18, gap: 8 },
  emptyTitle: { fontFamily: Fonts.rounded, fontSize: 16, fontWeight: '700' },
  emptyBody: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 20 },
  cardRow: { borderRadius: 22, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center', position: 'relative' },
  cardCopy: { flex: 1, gap: 5 },
  cardTitle: { fontFamily: Fonts.rounded, fontSize: 15, fontWeight: '700', lineHeight: 20 },
  cardBody: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19 },
  cardMeta: { fontFamily: Fonts.sans, fontSize: 12 },
  cardThumb: { width: 62, height: 62, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  videoBadge: { position: 'absolute', bottom: 6, right: 6, borderRadius: 999, padding: 4 },
  deleteButton: { position: 'absolute', top: 12, right: 12 },
  userRow: { borderRadius: 20, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center' },
  userCopy: { flex: 1, gap: 3 },
  userName: { fontFamily: Fonts.rounded, fontSize: 14, fontWeight: '700' },
  userMeta: { fontFamily: Fonts.sans, fontSize: 12, textTransform: 'capitalize' },
});
