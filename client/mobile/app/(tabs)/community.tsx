import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThreadCard } from '@/components/community/thread-card';
import { ChipGroup } from '@/components/ui/chip';
import { Fab } from '@/components/ui/fab';
import { TabHeader } from '@/components/ui/screen-header';
import { ListSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/state-views';
import { TextField } from '@/components/ui/text-field';
import { ScreenPadding, Spacing } from '@/constants/theme';
import { useCommunity, usePullToRefresh, useRefreshOnFocus } from '@/hooks/queries';
import { useReportContent } from '@/hooks/use-content-actions';
import { useTheme } from '@/hooks/use-theme';
import type { CommunityThread } from '@/lib/types';

const ALL_TOPICS = 'All topics';

export default function CommunityScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const community = useCommunity();
  const reportContent = useReportContent();
  const [query, setQuery] = useState('');
  const [room, setRoom] = useState(ALL_TOPICS);

  useRefreshOnFocus(community.refetch);
  const { refreshing, onRefresh } = usePullToRefresh(community.refetch);

  const threads = useMemo(() => {
    const search = query.trim().toLowerCase();

    return (community.data?.threads ?? []).filter((thread) => {
      if (room !== ALL_TOPICS && thread.category.toLowerCase() !== room.toLowerCase()) {
        return false;
      }

      return (
        !search ||
        [thread.title, thread.body, thread.category, thread.author.name, thread.author.location]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search))
      );
    });
  }, [community.data, query, room]);

  const reportThread = useCallback(
    (thread: CommunityThread) => reportContent({ targetType: 'thread', targetId: thread._id, label: 'discussion', note: thread.title }),
    [reportContent]
  );

  // Build topics from the threads themselves; the server's room list doesn't match thread categories.
  // Categories arrive with inconsistent casing ("Crop care" / "Crop Care"), so de-duplicate case-insensitively.
  const topics = useMemo(() => {
    const byKey = new Map<string, string>();
    (community.data?.threads ?? []).forEach((thread) => {
      const key = thread.category.toLowerCase();
      if (!byKey.has(key)) {
        byKey.set(key, thread.category.charAt(0).toUpperCase() + thread.category.slice(1).toLowerCase());
      }
    });
    return [ALL_TOPICS, ...Array.from(byKey.values()).sort()];
  }, [community.data]);

  const isFiltering = Boolean(query.trim()) || room !== ALL_TOPICS;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlatList
        data={threads}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <ThreadCard thread={item} onReport={reportThread} />}
        ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.header}>
            <TabHeader title="Community" subtitle="Ask farmers who've grown it, sold it, or fixed it before." />
            <TextField
              value={query}
              onChangeText={setQuery}
              icon="search"
              placeholder="Search pests, crops, prices…"
              returnKeyType="search"
              trailing={
                query ? (
                  <Pressable accessibilityLabel="Clear search" onPress={() => setQuery('')} hitSlop={8}>
                    <Feather name="x-circle" size={18} color={colors.textSubtle} />
                  </Pressable>
                ) : null
              }
            />
            {topics.length > 2 ? <ChipGroup options={topics} value={room} onChange={setRoom} bleed /> : null}
          </View>
        }
        ListEmptyComponent={
          community.isPending ? (
            <ListSkeleton />
          ) : community.isError ? (
            <ErrorState error={community.error} onRetry={() => void community.refetch()} retrying={community.isFetching} />
          ) : isFiltering ? (
            <EmptyState icon="search" title="No matching discussions" body="Try another crop, place, or symptom — or ask it yourself." />
          ) : (
            <EmptyState
              icon="help-circle"
              title="No discussions yet"
              body="Ask the first question. Someone has probably dealt with it before."
              action={{ label: 'Ask a question', onPress: () => router.push('/community/new') }}
            />
          )
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}
        showsVerticalScrollIndicator={false}
      />
      <Fab icon="help-circle" label="Ask" onPress={() => router.push('/community/new')} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: ScreenPadding, paddingBottom: 96 },
  header: { gap: Spacing.md, paddingBottom: Spacing.xs },
  separator: { height: StyleSheet.hairlineWidth },
});
