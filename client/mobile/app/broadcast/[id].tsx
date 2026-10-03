import Feather from '@expo/vector-icons/Feather';
import { useLocalSearchParams } from 'expo-router';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';

import { broadcastCategories, describeAudience, PublisherRow } from '@/components/broadcasts/broadcast-card';
import { AppText } from '@/components/ui/app-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ListSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/state-views';
import { ScreenPadding, Spacing } from '@/constants/theme';
import { useBroadcast } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';

export default function BroadcastScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const broadcast = useBroadcast(id);
  const { colors } = useTheme();

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Official update" />
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

          {broadcast.data.organization.description ? (
            <View style={styles.about}>
              <AppText variant="label">About {broadcast.data.organization.name}</AppText>
              <AppText variant="callout" color="textMuted">
                {broadcast.data.organization.description}
              </AppText>
              <AppText variant="caption" color="textSubtle">
                FarmConnect verified this organisation before it could publish here.
              </AppText>
            </View>
          ) : null}
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
  about: { gap: Spacing.xxs },
});
