import { Link, router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SocialAvatar } from '@/components/social-avatar';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { api } from '@/lib/api';
import type { CommunityThread } from '@/lib/types';

export default function CommunityScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [rooms, setRooms] = useState<string[]>([]);
  const [threads, setThreads] = useState<CommunityThread[]>([]);

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

  const header = useMemo(
    () => (
      <>
      <View style={[styles.heroCard, { backgroundColor: palette.surfaceRaised }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.heading, { color: palette.text }]}>Community</Text>
          <View style={styles.headerActions}>
            <Pressable style={[styles.iconButton, { backgroundColor: palette.surface }]} hitSlop={8}>
              <Feather name="search" size={16} color={palette.text} />
            </Pressable>
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

        <View style={styles.topRooms}>
          {rooms.map((room) => (
            <View
              key={room}
              style={[
                styles.roomChip,
                {
                  backgroundColor: palette.surface,
                },
              ]}>
              <Text style={[styles.roomChipText, { color: palette.text }]}>{room}</Text>
            </View>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingShell}>
          <ActivityIndicator color={palette.tint} />
        </View>
      ) : null}

      {!isLoading && threads.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: palette.surfaceRaised }]}>
          <Text style={[styles.emptyTitle, { color: palette.text }]}>No discussions yet</Text>
          <Text style={[styles.emptyCopy, { color: palette.muted }]}>Start a practical question for farmers, buyers, or hobbyists.</Text>
        </View>
      ) : null}
      </>
    ),
    [isLoading, palette, rooms, threads.length]
  );

  const renderThread = useCallback(
    ({ item: thread, index }: { item: CommunityThread; index: number }) => (
        <Pressable
          onPress={() => router.push({ pathname: '/community/[id]', params: { id: thread._id } })}
          key={thread._id}
          style={[styles.threadCard, { backgroundColor: palette.surfaceRaised }]}>
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
                {thread.isPinned ? (
                  <Text style={[styles.replyCount, { color: palette.tint }]}>Pinned</Text>
                ) : (
                  <Text style={[styles.replyCount, { color: palette.muted }]}>{thread.viewsCount} views</Text>
                )}
              </View>

              <Text style={[styles.threadTitle, { color: palette.text }]}>{thread.title}</Text>
              <Text style={[styles.threadPreview, { color: palette.muted }]}>{thread.preview}</Text>

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
    [palette]
  );

  return (
    <FlatList
      data={threads}
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
  heroCard: { borderRadius: 22, padding: 16, gap: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconButton: { width: 38, height: 38, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  heading: { fontFamily: Fonts.rounded, fontSize: 27, fontWeight: '700' },
  subheading: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20 },
  topRooms: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  roomChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  roomChipText: { fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '700' },
  loadingShell: { alignItems: 'center', paddingVertical: 8 },
  emptyCard: { borderRadius: 18, padding: 16, gap: 6 },
  emptyTitle: { fontFamily: Fonts.rounded, fontSize: 17, fontWeight: '800' },
  emptyCopy: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19 },
  threadCard: { borderRadius: 22, padding: 14 },
  threadBody: { flexDirection: 'row', gap: 12 },
  voteRail: { width: 34, alignItems: 'center', gap: 6, paddingTop: 4 },
  voteCount: { fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '700' },
  threadContent: { flex: 1, gap: 10 },
  threadMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  categoryPill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  categoryText: { fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '700' },
  replyCount: { fontFamily: Fonts.sans, fontSize: 13 },
  threadTitle: { fontFamily: Fonts.rounded, fontSize: 18, fontWeight: '700', lineHeight: 24 },
  threadPreview: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 21 },
  threadFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  threadAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  threadAuthorText: { flex: 1, marginLeft: 10 },
  threadAuthor: { fontFamily: Fonts.rounded, fontSize: 13, fontWeight: '700' },
  threadRole: { fontFamily: Fonts.sans, fontSize: 12 },
  threadIndex: { fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '700' },
});
