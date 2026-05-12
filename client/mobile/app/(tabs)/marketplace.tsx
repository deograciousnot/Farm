import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProductCard } from '@/components/product-card';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { api } from '@/lib/api';
import type { Product } from '@/lib/types';

export default function MarketplaceScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeFilter, setActiveFilter] = useState('All produce');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const loadMarketplace = useCallback(async () => {
    setIsLoading(true);

    try {
      const [overview, listings] = await Promise.all([api.getMarketplaceOverview(), api.getProducts()]);
      setFilters(overview.filters);
      setProducts(listings.items);
    } catch (error) {
      console.warn('Failed to load marketplace.', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadMarketplace();
    }, [loadMarketplace])
  );

  const visibleProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const categoryProducts =
      activeFilter === 'All produce' ? products : products.filter((product) => product.category === activeFilter);

    if (!query) {
      return categoryProducts;
    }

    return categoryProducts.filter((product) =>
      [product.name, product.category, product.description, product.location, product.seller?.name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [activeFilter, products, searchQuery]);

  const header = useMemo(
    () => (
      <>
      <View style={[styles.heroCard, { backgroundColor: palette.backgroundSecondary }]}>
        <View style={styles.heroTop}>
          <View style={styles.heroTitleWrap}>
            <Text style={[styles.eyebrow, { color: palette.tint }]}>Marketplace</Text>
            <Text style={[styles.heading, { color: palette.text }]}>Marketplace</Text>
          </View>
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')} style={[styles.clearSearchButton, { backgroundColor: palette.surfaceRaised }]}>
              <Feather name="x" size={16} color={palette.text} />
              <Text style={[styles.clearSearchText, { color: palette.text }]}>Clear</Text>
            </Pressable>
          ) : null}
        </View>

        <Text style={[styles.subheading, { color: palette.muted }]}>
          Browse produce and inputs with clearer trust context and less listing noise.
        </Text>
        {searchQuery ? (
          <View style={[styles.searchSummary, { backgroundColor: palette.surface }]}>
            <Feather name="search" size={14} color={palette.tint} />
            <Text style={[styles.searchSummaryText, { color: palette.text }]} numberOfLines={1}>
              {searchQuery}
            </Text>
          </View>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {filters.map((filter) => (
          <Pressable
            key={filter}
            onPress={() => setActiveFilter(filter)}
            style={[
              styles.filterChip,
              { backgroundColor: activeFilter === filter ? palette.tint : palette.surface },
            ]}>
            <Text style={[styles.filterChipText, { color: activeFilter === filter ? '#ffffff' : palette.text }]}>
              {filter}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={styles.loadingShell}>
          <ActivityIndicator color={palette.tint} />
        </View>
      ) : null}

      {!isLoading && visibleProducts.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: palette.surfaceRaised, borderColor: palette.border }]}>
          <Text style={[styles.emptyTitle, { color: palette.text }]}>No listings found</Text>
          <Text style={[styles.emptyCopy, { color: palette.muted }]}>Try another category or add a fresh listing.</Text>
        </View>
      ) : null}
      </>
    ),
    [activeFilter, filters, isLoading, palette, searchQuery, visibleProducts.length]
  );

  const renderProduct = useCallback(({ item }: { item: Product }) => <ProductCard product={item} />, []);

  return (
    <>
      <FlatList
        data={visibleProducts}
        keyExtractor={(item) => item._id}
        renderItem={renderProduct}
        style={[styles.screen, { backgroundColor: palette.background }]}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14 }]}
        ListHeaderComponent={header}
        showsVerticalScrollIndicator={false}
      />

      <View style={[styles.floatingDock, { bottom: insets.bottom + 92 }]}>
        <Pressable
          onPress={() => setIsSearchOpen(true)}
          style={[styles.floatingButton, { backgroundColor: `${palette.surfaceRaised}F2`, borderColor: palette.border }]}
          hitSlop={8}>
          <Feather name="search" size={20} color={palette.text} />
        </Pressable>
        <Pressable
          onPress={() => router.push('/modal')}
          style={[styles.floatingButton, styles.floatingPrimaryButton, { backgroundColor: `${palette.tint}EE` }]}
          hitSlop={8}>
          <Feather name="plus" size={22} color="#ffffff" />
        </Pressable>
      </View>

      <Modal visible={isSearchOpen} animationType="fade" transparent onRequestClose={() => setIsSearchOpen(false)}>
        <SafeAreaView style={styles.searchModalRoot}>
          <Pressable
            style={[styles.searchModalOverlay, { backgroundColor: 'rgba(0,0,0,0.26)' }]}
            onPress={() => setIsSearchOpen(false)}
          />
          <View style={[styles.searchPanel, { backgroundColor: `${palette.surfaceRaised}F7`, borderColor: palette.border }]}>
            <View style={styles.searchPanelHeader}>
              <View>
                <Text style={[styles.searchEyebrow, { color: palette.tint }]}>Search marketplace</Text>
                <Text style={[styles.searchTitle, { color: palette.text }]}>Find produce, inputs, sellers, or places.</Text>
              </View>
              <Pressable onPress={() => setIsSearchOpen(false)} hitSlop={8}>
                <Feather name="x" size={20} color={palette.text} />
              </Pressable>
            </View>
            <View style={[styles.searchInputWrap, { backgroundColor: palette.backgroundSecondary, borderColor: palette.border }]}>
              <Feather name="search" size={18} color={palette.muted} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search listings"
                placeholderTextColor={palette.muted}
                autoFocus
                returnKeyType="search"
                style={[styles.searchInput, { color: palette.text }]}
              />
              {searchQuery ? (
                <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                  <Feather name="x-circle" size={18} color={palette.muted} />
                </Pressable>
              ) : null}
            </View>
            <View style={styles.searchQuickRow}>
              {filters.slice(0, 4).map((filter) => (
                <Pressable
                  key={`search-${filter}`}
                  onPress={() => {
                    setActiveFilter(filter);
                    setIsSearchOpen(false);
                  }}
                  style={[styles.searchQuickChip, { backgroundColor: activeFilter === filter ? palette.text : palette.backgroundSecondary }]}>
                  <Text style={[styles.searchQuickText, { color: activeFilter === filter ? palette.background : palette.text }]}>
                    {filter}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 14, paddingTop: 14, gap: 14, paddingBottom: 118 },
  heroCard: { borderRadius: 22, padding: 16, gap: 12 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' },
  heroTitleWrap: { flex: 1, gap: 6 },
  eyebrow: { fontFamily: Fonts.rounded, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.3 },
  heading: { fontFamily: Fonts.rounded, fontSize: 28, fontWeight: '700', lineHeight: 33 },
  subheading: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20 },
  clearSearchButton: { borderRadius: 999, paddingHorizontal: 11, paddingVertical: 9, flexDirection: 'row', gap: 6, alignItems: 'center' },
  clearSearchText: { fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '800' },
  searchSummary: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', gap: 8, alignItems: 'center', alignSelf: 'flex-start', maxWidth: '100%' },
  searchSummaryText: { fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '800', flexShrink: 1 },
  filters: { gap: 8, paddingVertical: 4, paddingRight: 10 },
  filterChip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  filterChipText: { fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '700' },
  loadingShell: { alignItems: 'center', paddingVertical: 8 },
  emptyCard: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 6 },
  emptyTitle: { fontFamily: Fonts.rounded, fontSize: 17, fontWeight: '800' },
  emptyCopy: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19 },
  floatingDock: { position: 'absolute', right: 16, gap: 10, alignItems: 'center' },
  floatingButton: {
    width: 52,
    height: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  floatingPrimaryButton: { width: 58, height: 58, borderWidth: 0 },
  searchModalRoot: { flex: 1, justifyContent: 'flex-end' },
  searchModalOverlay: { ...StyleSheet.absoluteFillObject },
  searchPanel: {
    margin: 14,
    borderRadius: 28,
    padding: 18,
    gap: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchPanelHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  searchEyebrow: { fontFamily: Fonts.rounded, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2 },
  searchTitle: { fontFamily: Fonts.rounded, fontSize: 21, fontWeight: '800', lineHeight: 27, marginTop: 3, maxWidth: 280 },
  searchInputWrap: {
    minHeight: 50,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 13,
    flexDirection: 'row',
    gap: 9,
    alignItems: 'center',
  },
  searchInput: { flex: 1, fontFamily: Fonts.sans, fontSize: 15, paddingVertical: 11 },
  searchQuickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  searchQuickChip: { borderRadius: 999, paddingHorizontal: 13, paddingVertical: 10 },
  searchQuickText: { fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '800' },
});
