import { Link, router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SocialAvatar } from '@/components/social-avatar';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { api } from '@/lib/api';
import type { CommunityThread } from '@/lib/types';
import { useSession } from '@/providers/session-provider';

export default function CommunityScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const insets = useSafeAreaInsets();
  const { token } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [rooms, setRooms] = useState<string[]>([]);
  const [threads, setThreads] = useState<CommunityThread[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const loadCommunity = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await api.getCommunity();
      setRooms(response.rooms);
      setThreads(response.threads);
    } catch (error) {
      console.warn('Failed to load community.', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadCommunity();
    }, [loadCommunity])
  );

  const reportThread = useCallback(
    (thread: CommunityThread) => {
      if (!token) {
        Alert.alert('Sign in required', 'Please sign in before reporting content.');
        return;
      }

      Alert.alert('Report thread?', 'Send this discussion to FarmConnect moderation for review.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.reportContent(token, {
                targetType: 'thread',
                targetId: thread._id,
                reason: 'User reported thread',
                note: thread.title,
              });
              Alert.alert('Report sent', 'Thanks. The moderation team will review this thread.');
            } catch (error) {
              Alert.alert('Report failed', error instanceof Error ? error.message : 'Something went wrong.');
            }
          },
        },
      ]);
    },
    [token]
  );

  const visibleThreads = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return threads;
    }

    return threads.filter((thread) =>
      [thread.title, thread.body, thread.preview, thread.category, thread.author.name, thread.author.location]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [searchQuery, threads]);

  const header = useMemo(
    () => (
      <>
      <View style={styles.heroBlock}>
        <View style={styles.headerRow}>
          <Text style={[styles.heading, { color: palette.text }]}>Community</Text>
          <View style={styles.headerActions}>
            <Link href="/community/new" asChild>
              <Pressable style={[styles.iconButton, { backgroundColor: `${palette.tint}16` }]} hitSlop={8}>
                <Feather name="plus" size={16} color={palette.tint} />
              </Pressable>
            </Link>
          </View>
        </View>
        <Text style={[styles.subheading, { color: palette.muted }]}>
          Focused agri questions, sharper answers, less forum clutter.
        </Text>

        <View style={[styles.searchBox, { backgroundColor: palette.surfaceRaised, borderColor: palette.border }]}>
          <Feather name="search" size={17} color={palette.muted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search pests, prices, animals, inputs..."
            placeholderTextColor={palette.muted}
            style={[styles.searchInput, { color: palette.text }]}
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <Feather name="x-circle" size={18} color={palette.muted} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.topRooms}>
          {rooms.map((room) => (
            <Pressable
              key={room}
              onPress={() => setSearchQuery((current) => (current === room ? '' : room))}
              style={[
                styles.roomChip,
                {
                  backgroundColor: searchQuery === room ? palette.text : palette.surfaceRaised,
                },
              ]}>
              <Text style={[styles.roomChipText, { color: searchQuery === room ? palette.background : palette.text }]}>{room}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingShell}>
          <ActivityIndicator color={palette.tint} />
        </View>
      ) : null}

      {!isLoading && visibleThreads.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={[styles.emptyTitle, { color: palette.text }]}>
            {searchQuery ? 'No matching discussions' : 'No discussions yet'}
          </Text>
          <Text style={[styles.emptyCopy, { color: palette.muted }]}>
            {searchQuery ? 'Try a different topic, crop, place, or symptom.' : 'Start a practical question for farmers, buyers, or hobbyists.'}
          </Text>
        </View>
      ) : null}
      </>
    ),
    [isLoading, palette, rooms, searchQuery, visibleThreads.length]
  );

  const renderThread = useCallback(
    ({ item: thread, index }: { item: CommunityThread; index: number }) => (
        <Pressable
          onPress={() => router.push({ pathname: '/community/[id]', params: { id: thread._id } })}
          key={thread._id}
          style={styles.threadCard}>
          <View style={styles.threadBody}>
            <View style={styles.voteRail}>
              <Feather name="arrow-up" size={16} color={palette.muted} />
              <Text style={[styles.voteCount, { color: palette.text }]}>{thread.repliesCount}</Text>
              <Feather name="message-square" size={15} color={palette.muted} />
            </View>

            <View style={styles.threadContent}>
              <View style={styles.threadMetaRow}>
                <View
                  style={[
                    styles.categoryPill,
                    { backgroundColor: index % 2 === 0 ? `${palette.accentSecondary}16` : `${palette.tint}12` },
                  ]}>
                  <Text
                    style={[
                      styles.categoryText,
                      { color: index % 2 === 0 ? palette.accentSecondary : palette.tint },
                    ]}>
                    {thread.category}
                  </Text>
                </View>
                <View style={styles.threadMetaActions}>
                  {thread.isPinned ? (
                    <Text style={[styles.replyCount, { color: palette.tint }]}>Pinned</Text>
                  ) : (
                    <Text style={[styles.replyCount, { color: palette.muted }]}>{thread.viewsCount} views</Text>
                  )}
                  <Pressable
                    onPress={(event) => {
                      event.stopPropagation();
                      reportThread(thread);
                    }}
                    hitSlop={8}
                    style={styles.moreButton}>
                    <Feather name="more-horizontal" size={18} color={palette.muted} />
                  </Pressable>
                </View>
              </View>

              <Text style={[styles.threadTitle, { color: palette.text }]}>{thread.title}</Text>
              <Text style={[styles.threadPreview, { color: palette.muted }]}>{thread.preview}</Text>
              {thread.media?.[0] ? (
                <Image
                  source={{ uri: thread.media[0].thumbnailUrl || thread.media[0].url }}
                  contentFit="cover"
                  style={styles.threadThumb}
                />
              ) : null}

              <View style={styles.threadFooter}>
                <View style={styles.threadAuthorRow}>
                  <SocialAvatar name={thread.author.name} imageUrl={thread.author.avatarUrl} size={34} />
                  <View style={styles.threadAuthorText}>
                    <Text style={[styles.threadAuthor, { color: palette.text }]}>{thread.author.name}</Text>
                    <Text style={[styles.threadRole, { color: palette.muted }]}>
                      {thread.author.role} - {thread.author.location}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.threadIndex, { color: palette.muted }]}>#{index + 1}</Text>
              </View>
            </View>
          </View>
        </Pressable>
    ),
    [palette, reportThread]
  );

  return (
    <FlatList
      data={visibleThreads}
      keyExtractor={(item) => item._id}
      renderItem={renderThread}
      style={[styles.screen, { backgroundColor: palette.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 14 }]}
      ListHeaderComponent={header}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 14, paddingTop: 14, gap: 14, paddingBottom: 28 },
  heroBlock: { paddingHorizontal: 2, gap: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconButton: { width: 38, height: 38, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  heading: { fontFamily: Fonts.rounded, fontSize: 27, fontWeight: '700' },
  subheading: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20 },
  searchBox: {
    minHeight: 48,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 13,
    flexDirection: 'row',
    gap: 9,
    alignItems: 'center',
  },
  searchInput: { flex: 1, fontFamily: Fonts.sans, fontSize: 14, paddingVertical: 10 },
  topRooms: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  roomChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  roomChipText: { fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '700' },
  loadingShell: { alignItems: 'center', paddingVertical: 8 },
  emptyCard: { paddingVertical: 18, gap: 6 },
  emptyTitle: { fontFamily: Fonts.rounded, fontSize: 17, fontWeight: '800' },
  emptyCopy: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19 },
  threadCard: { paddingVertical: 14 },
  threadBody: { flexDirection: 'row', gap: 12 },
  voteRail: { width: 34, alignItems: 'center', gap: 6, paddingTop: 4 },
  voteCount: { fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '700' },
  threadContent: { flex: 1, gap: 10 },
  threadMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  threadMetaActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  moreButton: { width: 28, height: 28, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  categoryPill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  categoryText: { fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '700' },
  replyCount: { fontFamily: Fonts.sans, fontSize: 13 },
  threadTitle: { fontFamily: Fonts.rounded, fontSize: 18, fontWeight: '700', lineHeight: 24 },
  threadPreview: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 21 },
  threadThumb: { width: '100%', height: 150, borderRadius: 18 },
  threadFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  threadAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  threadAuthorText: { flex: 1, marginLeft: 10 },
  threadAuthor: { fontFamily: Fonts.rounded, fontSize: 13, fontWeight: '700' },
  threadRole: { fontFamily: Fonts.sans, fontSize: 12 },
  threadIndex: { fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '700' },
});
