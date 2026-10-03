import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { BroadcastCard } from '@/components/broadcasts/broadcast-card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ListSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/state-views';
import { ScreenPadding, Spacing } from '@/constants/theme';
import { useBroadcasts, usePullToRefresh } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';

/** Every live official update for this member's county and role. */
export default function BroadcastsScreen() {
  const { colors } = useTheme();
  const broadcasts = useBroadcasts();
  const { refreshing, onRefresh } = usePullToRefresh(broadcasts.refetch);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Official updates" />
      <FlatList
        data={broadcasts.data ?? []}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <BroadcastCard broadcast={item} />}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
        ListEmptyComponent={
          broadcasts.isPending ? (
            <ListSkeleton count={2} />
          ) : broadcasts.isError ? (
            <ErrorState error={broadcasts.error} onRetry={() => void broadcasts.refetch()} retrying={broadcasts.isFetching} />
          ) : (
            <EmptyState
              icon="volume-2"
              title="No official updates right now"
              body="Advisories, pest alerts, and programmes from verified organisations will appear here."
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: ScreenPadding, paddingTop: Spacing.xs, paddingBottom: Spacing.xxl, gap: Spacing.sm },
});
