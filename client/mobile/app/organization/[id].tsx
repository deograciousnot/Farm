import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';

import { broadcastCategories } from '@/components/broadcasts/broadcast-card';
import { ProductCard } from '@/components/market/product-card';
import { AppText } from '@/components/ui/app-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Section } from '@/components/ui/section';
import { ListSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/state-views';
import { Radius, ScreenPadding, Spacing } from '@/constants/theme';
import { useOrganization } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import { formatRelativeTime } from '@/utils/format';

const typeLabels: Record<string, string> = {
  government: 'National government',
  county: 'County government',
  research: 'Research institute',
  ngo: 'Non-profit',
  cooperative: 'Cooperative',
  company: 'Company',
  other: 'Organisation',
};

/** An organisation's public page: who they are, what FarmConnect checked, what they sell, what they've posted. */
export default function OrganizationScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const organization = useOrganization(id);
  const { colors } = useTheme();
  const data = organization.data;

  return (
    <View style={styles.screen}>
      <ScreenHeader title={data?.item.name ?? 'Organisation'} />
      {organization.isPending ? (
        <View style={styles.content}>
          <ListSkeleton count={2} />
        </View>
      ) : organization.isError ? (
        <ErrorState error={organization.error} onRetry={() => void organization.refetch()} retrying={organization.isFetching} />
      ) : !data ? (
        <EmptyState icon="briefcase" title="Organisation not found" />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.identity}>
            <View style={[styles.logo, { backgroundColor: colors.primarySoft }]}>
              {data.item.logoUrl ? (
                <Image source={{ uri: data.item.logoUrl }} contentFit="cover" style={StyleSheet.absoluteFill} accessibilityLabel={`${data.item.name} logo`} />
              ) : (
                <Feather name={data.item.sponsored ? 'briefcase' : 'shield'} size={26} color={colors.primary} />
              )}
            </View>
            <View style={styles.flex}>
              <AppText variant="title">{data.item.name}</AppText>
              <AppText variant="callout" color="textMuted">
                {typeLabels[data.item.type] ?? 'Organisation'}
              </AppText>
            </View>
          </View>

          <Card tone={data.item.verification.status === 'verified' ? 'surface' : 'surfaceMuted'} style={styles.verification}>
            <Feather
              name={data.item.verification.status === 'verified' ? 'check-circle' : 'alert-circle'}
              size={20}
              color={data.item.verification.status === 'verified' ? colors.primary : colors.textMuted}
            />
            <View style={styles.flex}>
              <AppText variant="label">{data.item.verification.status === 'verified' ? 'Verified by FarmConnect' : 'Not verified yet'}</AppText>
              <AppText variant="callout" color="textMuted">
                {data.item.verification.status === 'verified'
                  ? `We checked their ${data.item.verification.note.charAt(0).toLowerCase()}${data.item.verification.note.slice(1)}.`
                  : "FarmConnect hasn't checked this organisation's documents yet."}
              </AppText>
            </View>
          </Card>

          {data.item.description ? (
            <AppText variant="body" color="textMuted">
              {data.item.description}
            </AppText>
          ) : null}

          {data.item.website ? (
            <Button
              label="Visit website"
              icon="external-link"
              variant="secondary"
              onPress={() => void Linking.openURL(data.item.website!)}
              style={styles.alignStart}
            />
          ) : null}

          {data.products.length ? (
            <Section title="Products">
              <View style={styles.grid}>
                {data.products.map((product) => (
                  <View key={product._id} style={styles.gridItem}>
                    <ProductCard product={product} />
                  </View>
                ))}
              </View>
            </Section>
          ) : null}

          {data.updates.length ? (
            <Section title="Recent updates">
              <View style={styles.updates}>
                {data.updates.map((update) => {
                  const category = broadcastCategories[update.category] ?? broadcastCategories.advisory;
                  return (
                    <Card key={update._id} onPress={() => router.push({ pathname: '/broadcast/[id]', params: { id: update._id } })} style={styles.update}>
                      <View style={styles.badges}>
                        <Badge label={category.label} tone={category.tone} icon={category.icon} />
                        {update.kind === 'sponsored' ? <Badge label="Sponsored" /> : null}
                      </View>
                      <AppText variant="subhead" numberOfLines={2}>
                        {update.title}
                      </AppText>
                      <AppText variant="caption" color="textMuted">
                        {formatRelativeTime(update.publishedAt)}
                      </AppText>
                    </Card>
                  );
                })}
              </View>
            </Section>
          ) : null}

          {data.item.sponsored ? (
            <AppText variant="caption" color="textSubtle">
              This is a company. Its updates are marked Sponsored, and FarmConnect reviews each one before it goes out.
            </AppText>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1, gap: 2 },
  content: { paddingHorizontal: ScreenPadding, paddingTop: Spacing.xs, paddingBottom: Spacing.xxl, gap: Spacing.lg },
  identity: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  logo: { width: 64, height: 64, borderRadius: Radius.lg, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  verification: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  alignStart: { alignSelf: 'flex-start' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  gridItem: { width: '47%' },
  updates: { gap: Spacing.sm },
  update: { gap: Spacing.xs },
  badges: { flexDirection: 'row', gap: 6 },
});
