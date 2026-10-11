import Feather from '@expo/vector-icons/Feather';
import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';

import { broadcastCategories, describeAudience, isSponsored, PublisherRow } from '@/components/broadcasts/broadcast-card';
import { AppText } from '@/components/ui/app-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ListRow } from '@/components/ui/list-row';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ListSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/state-views';
import { ScreenPadding, Spacing } from '@/constants/theme';
import { queryKeys, useBroadcast } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';

export default function BroadcastScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const broadcast = useBroadcast(id);
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  // Opening an update marks it read; refresh the lists so the "New" badge clears.
  useEffect(() => {
    if (broadcast.isSuccess) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.broadcastsRoot });
    }
  }, [broadcast.isSuccess, queryClient]);

  return (
    <View style={styles.screen}>
      <ScreenHeader title={broadcast.data && isSponsored(broadcast.data) ? 'Sponsored update' : 'Official update'} />
      {broadcast.isPending ? (
        <View style={styles.content}>
          <ListSkeleton count={1} />
        </View>
      ) : broadcast.isError ? (
        <ErrorState error={broadcast.error} onRetry={() => void broadcast.refetch()} retrying={broadcast.isFetching} />
      ) : !broadcast.data ? (
        <EmptyState icon="volume-x" title="Update not found" />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <PublisherRow broadcast={broadcast.data} size="md" />
          <View style={styles.article}>
            {(() => {
              const category = broadcastCategories[broadcast.data.category] ?? broadcastCategories.advisory;
              return <Badge label={category.label} tone={category.tone} icon={category.icon} />;
            })()}
            <AppText variant="title">{broadcast.data.title}</AppText>
            <AppText variant="body">{broadcast.data.body}</AppText>
          </View>

          {broadcast.data.link?.url ? (
            <Button
              label={broadcast.data.link.label || 'Learn more'}
              icon="external-link"
              variant="secondary"
              onPress={() => void Linking.openURL(broadcast.data.link!.url)}
              style={styles.alignStart}
            />
          ) : null}

          <Card tone="surfaceMuted" style={styles.meta}>
            <Feather name="users" size={16} color={colors.textMuted} />
            <AppText variant="callout" color="textMuted" style={styles.flex}>
              {describeAudience(broadcast.data)}
            </AppText>
          </Card>

          <View style={styles.about}>
            <Card padded={false}>
              <ListRow
                icon={isSponsored(broadcast.data) ? 'briefcase' : 'shield'}
                title={broadcast.data.organization.name}
                subtitle={broadcast.data.organization.description || 'See their page on FarmConnect'}
                onPress={() => router.push({ pathname: '/organization/[id]', params: { id: broadcast.data!.organization._id } })}
              />
            </Card>
            <AppText variant="caption" color="textSubtle">
              {isSponsored(broadcast.data)
                ? 'A paid message from a company. FarmConnect reviewed it before it went out, but does not endorse their products.'
                : 'FarmConnect verified this organisation before it could publish here.'}
            </AppText>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingHorizontal: ScreenPadding, paddingTop: Spacing.xs, paddingBottom: Spacing.xxl, gap: Spacing.lg },
  article: { gap: Spacing.sm },
  alignStart: { alignSelf: 'flex-start' },
  meta: { flexDirection: 'row', alignItems: 'center' },
  about: { gap: Spacing.xs },
});
