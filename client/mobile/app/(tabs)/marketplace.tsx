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
  const [products, setProducts] = useState<Product[]>([]);
  const [activeFilter, setActiveFilter] = useState('All produce');

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

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: palette.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <View style={[styles.heroCard, { backgroundColor: palette.backgroundSecondary }]}>
        <View style={[styles.heroGlowLarge, { backgroundColor: `${palette.accentSecondary}20` }]} />
        <View style={[styles.heroGlowSmall, { backgroundColor: `${palette.tint}16` }]} />

        <View style={styles.heroTop}>
          <View style={styles.heroTitleWrap}>
            <Text style={[styles.eyebrow, { color: palette.tint }]}>Marketplace</Text>
            <Text style={[styles.heading, { color: palette.text }]}>Trust-led buying with lighter, faster browsing.</Text>
          </View>
          <View style={styles.heroActions}>
            <Pressable style={[styles.iconButton, { backgroundColor: palette.surfaceRaised }]} hitSlop={8}>
              <Feather name="search" size={16} color={palette.text} />
            </Pressable>
            <Link href="/modal" asChild>
              <Pressable style={[styles.iconButton, { backgroundColor: `${palette.tint}16` }]} hitSlop={8}>
                <Feather name="plus" size={16} color={palette.tint} />
              </Pressable>
            </Link>
          </View>
        </View>

        <Text style={[styles.subheading, { color: palette.muted }]}>
          Browse produce and inputs with clearer trust context and less listing noise.
        </Text>
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
  heroCard: { borderRadius: 28, padding: 16, gap: 12, overflow: 'hidden' },
  heroGlowLarge: { position: 'absolute', width: 160, height: 160, borderRadius: 999, right: -34, top: -42 },
  heroGlowSmall: { position: 'absolute', width: 102, height: 102, borderRadius: 999, left: -20, bottom: -20 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' },
  heroTitleWrap: { flex: 1, gap: 6 },
  heroActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  eyebrow: { fontFamily: Fonts.rounded, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.3 },
  heading: { fontFamily: Fonts.rounded, fontSize: 28, fontWeight: '700', lineHeight: 33 },
  subheading: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20 },
  iconButton: { width: 38, height: 38, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  filters: { gap: 8, paddingVertical: 4, paddingRight: 10 },
  filterChip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  filterChipText: { fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '700' },
  loadingShell: { alignItems: 'center', paddingVertical: 8 },
  catalog: { gap: 14 },
});
