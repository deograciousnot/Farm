import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProductCard } from '@/components/market/product-card';
import { Chip } from '@/components/ui/chip';
import { Fab } from '@/components/ui/fab';
import { ListRow } from '@/components/ui/list-row';
import { TabHeader } from '@/components/ui/screen-header';
import { Sheet } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/state-views';
import { TextField } from '@/components/ui/text-field';
import { Radius, ScreenPadding, Spacing } from '@/constants/theme';
import { useMarketplace, usePullToRefresh, useRefreshOnFocus } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/providers/session-provider';

const ALL = 'All';
const ANYWHERE = 'Anywhere';

export default function MarketplaceScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // Fixed cell width so a lone last item doesn't stretch across both columns.
  const cellWidth = (width - ScreenPadding * 2 - Spacing.sm) / 2;
  const { user } = useSession();
  const marketplace = useMarketplace();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(ALL);
  const [location, setLocation] = useState(ANYWHERE);
  const [isLocationSheetOpen, setIsLocationSheetOpen] = useState(false);

  useRefreshOnFocus(marketplace.refetch);
  const { refreshing, onRefresh } = usePullToRefresh(marketplace.refetch);

  const products = useMemo(() => marketplace.data?.products ?? [], [marketplace.data]);
  // Derived from listings: the server's filter list includes values that aren't real categories.
  const categories = useMemo(() => [ALL, ...Array.from(new Set(products.map((p) => p.category))).sort()], [products]);
  const locations = useMemo(() => [ANYWHERE, ...Array.from(new Set(products.map((p) => p.location).filter(Boolean))).sort()], [products]);

  const visibleProducts = useMemo(() => {
    const search = query.trim().toLowerCase();

    return products.filter(
      (product) =>
        (category === ALL || product.category === category) &&
        (location === ANYWHERE || product.location === location) &&
        (!search ||
          [product.name, product.category, product.description, product.location, product.seller?.name]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(search)))
    );
  }, [category, location, products, query]);

  const isFiltering = Boolean(query.trim()) || category !== ALL || location !== ANYWHERE;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlatList
        data={visibleProducts}
        keyExtractor={(item) => item._id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <View style={{ width: cellWidth }}>
            <ProductCard product={item} />
          </View>
        )}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.header}>
            <TabHeader title="Market" subtitle="Produce and inputs, straight from the people who grow and make them." />
            <TextField
              value={query}
              onChangeText={setQuery}
              icon="search"
              placeholder="Search produce, inputs, sellers…"
              returnKeyType="search"
              trailing={
                query ? (
                  <Pressable accessibilityLabel="Clear search" onPress={() => setQuery('')} hitSlop={8}>
                    <Feather name="x-circle" size={18} color={colors.textSubtle} />
                  </Pressable>
                ) : null
              }
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.chips}>
              <Chip
                label={location}
                icon="map-pin"
                trailingIcon="chevron-down"
                selected={location !== ANYWHERE}
                onPress={() => setIsLocationSheetOpen(true)}
              />
              {categories.map((option) => (
                <Chip key={option} label={option} selected={option === category} onPress={() => setCategory(option)} />
              ))}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          marketplace.isPending ? (
            <GridSkeleton />
          ) : marketplace.isError ? (
            <ErrorState error={marketplace.error} onRetry={() => void marketplace.refetch()} retrying={marketplace.isFetching} />
          ) : isFiltering ? (
            <EmptyState
              icon="search"
              title="No listings match"
              body="Try a different search, category, or location."
              action={{
                label: 'Clear filters',
                onPress: () => {
                  setQuery('');
                  setCategory(ALL);
                  setLocation(ANYWHERE);
                },
              }}
            />
          ) : (
            <EmptyState icon="shopping-bag" title="No listings yet" body="Farmers' produce and inputs will appear here." />
          )
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}
        showsVerticalScrollIndicator={false}
      />

      {user?.role === 'farmer' ? (
        <Fab icon="plus" label="Sell" onPress={() => router.push({ pathname: '/modal', params: { mode: 'listing' } })} />
      ) : null}

      <Sheet visible={isLocationSheetOpen} onClose={() => setIsLocationSheetOpen(false)} title="Location" subtitle="Show listings from one area">
        <ScrollView style={styles.locationList}>
          {locations.map((option) => (
            <ListRow
              key={option}
              title={option}
              icon={option === ANYWHERE ? 'globe' : 'map-pin'}
              onPress={() => {
                setLocation(option);
                setIsLocationSheetOpen(false);
              }}
              trailing={option === location ? <Feather name="check" size={18} color={colors.primary} /> : <View />}
            />
          ))}
        </ScrollView>
      </Sheet>
    </View>
  );
}

function GridSkeleton() {
  return (
    <View style={styles.skeletonGrid}>
      {Array.from({ length: 4 }, (_, index) => (
        <View key={index} style={styles.skeletonItem}>
          <Skeleton height={150} radius={Radius.lg} />
          <Skeleton width="80%" />
          <Skeleton width="50%" />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: ScreenPadding, paddingBottom: 96, gap: Spacing.lg },
  header: { gap: Spacing.md },
  row: { gap: Spacing.sm },
  bleed: { marginHorizontal: -ScreenPadding },
  chips: { gap: Spacing.xs, paddingHorizontal: ScreenPadding },
  locationList: { maxHeight: 420 },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  skeletonItem: { width: '48%', gap: Spacing.xs },
});
