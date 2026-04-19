import { Link, router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SocialAvatar } from '@/components/social-avatar';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { api } from '@/lib/api';
import type { CommunityStat, CommunityThread } from '@/lib/types';

export default function CommunityScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const [isLoading, setIsLoading] = useState(true);
  const [rooms, setRooms] = useState<string[]>([]);
  const [stats, setStats] = useState<CommunityStat[]>([]);
  const [threads, setThreads] = useState<CommunityThread[]>([]);

  const loadCommunity = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await api.getCommunity();
      setRooms(response.rooms);
      setStats(response.stats);
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

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: palette.background }]}
      contentContainerStyle={styles.content}>
      <View style={[styles.heroCard, { backgroundColor: palette.surfaceRaised }]}>
        <View style={[styles.heroGlowLarge, { backgroundColor: `${palette.tint}18` }]} />
        <View style={[styles.heroGlowSmall, { backgroundColor: `${palette.accentSecondary}18` }]} />

        <Text style={[styles.heading, { color: palette.text }]}>Community</Text>
        <Text style={[styles.subheading, { color: palette.muted }]}>
          More like focused agri conversations than bulky forum blocks. Ask better questions, get faster answers.
        </Text>

        <View style={styles.heroActions}>
          <Link href="/community/new" asChild>
            <Pressable style={[styles.heroActionPrimary, { backgroundColor: palette.tint }]}>
              <Text style={styles.heroActionPrimaryText}>Start a thread</Text>
            </Pressable>
          </Link>
          <View style={[styles.heroActionSecondary, { backgroundColor: palette.surface }]}>
            <Text style={[styles.heroActionSecondaryText, { color: palette.text }]}>Browse hot topics</Text>
          </View>
        </View>

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

      <View style={styles.statsRow}>
        {stats.map((item, index) => (
          <View
            key={item.category}
            style={[
              styles.statCard,
              {
                backgroundColor: index === 0 ? `${palette.tint}12` : palette.surfaceRaised,
              },
            ]}>
            <Text style={[styles.statValue, { color: palette.text }]}>{item.threads}</Text>
            <Text style={[styles.statLabel, { color: palette.muted }]}>{item.category}</Text>
          </View>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loadingShell}>
          <ActivityIndicator color={palette.tint} />
        </View>
      ) : null}

      {threads.map((thread, index) => (
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
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 14, paddingTop: 14, gap: 14, paddingBottom: 28 },
  heroCard: { borderRadius: 24, padding: 16, gap: 12, overflow: 'hidden' },
  heroGlowLarge: {
    position: 'absolute',
    width: 152,
    height: 152,
    borderRadius: 999,
    right: -28,
    top: -32,
  },
  heroGlowSmall: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 999,
    left: -18,
    bottom: -14,
  },
  heading: { fontFamily: Fonts.rounded, fontSize: 27, fontWeight: '700' },
  subheading: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20 },
  heroActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  heroActionPrimary: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 11 },
  heroActionPrimaryText: { color: '#ffffff', fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '700' },
  heroActionSecondary: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 11 },
  heroActionSecondaryText: { fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '700' },
  topRooms: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  roomChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  roomChipText: { fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '700' },
  loadingShell: { alignItems: 'center', paddingVertical: 8 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { minWidth: 104, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12, gap: 2 },
  statValue: { fontFamily: Fonts.rounded, fontSize: 18, fontWeight: '700' },
  statLabel: { fontFamily: Fonts.sans, fontSize: 12 },
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
