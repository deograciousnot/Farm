import { Link } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ProductCard } from '@/components/product-card';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { api } from '@/lib/api';
import type { Product } from '@/lib/types';

export default function MarketplaceScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<string[]>([]);
  const [shortcuts, setShortcuts] = useState<{ label: string; value: string }[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const loadMarketplace = useCallback(async () => {
    setIsLoading(true);

    try {
      const [overview, listings] = await Promise.all([api.getMarketplaceOverview(), api.getProducts()]);
      setFilters(overview.filters);
      setShortcuts(overview.shortcuts);
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

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: palette.background }]}
      contentContainerStyle={styles.content}>
      <View style={[styles.heroCard, { backgroundColor: palette.surfaceRaised }]}>
        <View style={[styles.heroGlowLarge, { backgroundColor: `${palette.accentSecondary}24` }]} />
        <View style={[styles.heroGlowSmall, { backgroundColor: `${palette.tint}16` }]} />

        <Text style={[styles.heading, { color: palette.text }]}>Marketplace</Text>
        <Text style={[styles.subheading, { color: palette.muted }]}>
          Buyers should feel speed and trust here, but still stay in the same colorful FarmConnect world.
        </Text>

        <Link href="/modal" asChild>
          <Pressable style={[styles.createAction, { backgroundColor: `${palette.tint}12` }]}>
            <Feather name="plus-square" size={16} color={palette.tint} />
            <Text style={[styles.createActionText, { color: palette.tint }]}>Create listing</Text>
          </Pressable>
        </Link>

        <View style={[styles.searchBar, { backgroundColor: palette.backgroundTertiary }]}>
          <Text style={[styles.searchText, { color: palette.muted }]}>Search tomatoes, suppliers, counties, or inputs</Text>
        </View>

        <View style={styles.shortcuts}>
          {shortcuts.map((shortcut, index) => (
            <View
              key={shortcut.label}
              style={[
                styles.shortcutCard,
                {
                  backgroundColor:
                    index === 0 ? `${palette.tint}14` : index === 1 ? `${palette.accent}12` : `${palette.accentSecondary}16`,
                },
              ]}>
              <Text style={[styles.shortcutLabel, { color: palette.text }]}>{shortcut.label}</Text>
              <Text style={[styles.shortcutValue, { color: palette.muted }]}>{shortcut.value}</Text>
            </View>
          ))}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {filters.map((filter, index) => (
          <View
            key={filter}
            style={[
              styles.filterChip,
              {
                backgroundColor: index === 0 ? palette.tint : palette.surfaceRaised,
              },
            ]}>
            <Text style={[styles.filterChipText, { color: index === 0 ? '#ffffff' : palette.text }]}>{filter}</Text>
          </View>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={styles.loadingShell}>
          <ActivityIndicator color={palette.tint} />
        </View>
      ) : null}

      <View style={styles.catalog}>
        {products.map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 14, paddingTop: 14, gap: 14, paddingBottom: 28 },
  heroCard: { borderRadius: 24, padding: 16, gap: 12, overflow: 'hidden' },
  heroGlowLarge: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 999,
    right: -34,
    top: -36,
  },
  heroGlowSmall: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 999,
    left: -22,
    bottom: -24,
  },
  heading: { fontFamily: Fonts.rounded, fontSize: 27, fontWeight: '700' },
  subheading: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20 },
  createAction: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', gap: 8, alignItems: 'center' },
  createActionText: { fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '700' },
  searchBar: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 },
  searchText: { fontFamily: Fonts.sans, fontSize: 14 },
  shortcuts: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  shortcutCard: { minWidth: 96, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, gap: 2 },
  shortcutLabel: { fontFamily: Fonts.rounded, fontSize: 13, fontWeight: '700' },
  shortcutValue: { fontFamily: Fonts.sans, fontSize: 12 },
  filters: { gap: 10, paddingVertical: 4 },
  filterChip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  filterChipText: { fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '700' },
  loadingShell: { alignItems: 'center', paddingVertical: 8 },
  catalog: { gap: 14 },
});
