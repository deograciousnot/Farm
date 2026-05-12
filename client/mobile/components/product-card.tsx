import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SocialAvatar } from '@/components/social-avatar';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Product } from '@/lib/types';
import { formatCurrency } from '@/utils/format';

type ProductCardProps = {
  product: Product;
};

const productAccents: Record<string, { primary: string; secondary: string }> = {
  Vegetables: { primary: '#1f8f55', secondary: '#ef5b4c' },
  Fruits: { primary: '#ef5b4c', secondary: '#f5a623' },
  Grains: { primary: '#d97706', secondary: '#d33f49' },
};

export function ProductCard({ product }: ProductCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const accents =
    productAccents[product.category] ?? { primary: palette.tint, secondary: palette.accentSecondary };

  return (
    <Pressable
      onPress={() => router.push(`/product/${product._id}`)}
      style={[styles.card, { backgroundColor: palette.surfaceRaised }]}>
      <View style={[styles.media, { backgroundColor: palette.backgroundTertiary }]}>
        <View style={[styles.mediaBlobPrimary, { backgroundColor: `${accents.primary}22` }]} />
        <View style={[styles.mediaBlobSecondary, { backgroundColor: `${accents.secondary}20` }]} />
        <View style={styles.mediaTopRow}>
          <View style={[styles.mediaBadge, { backgroundColor: palette.surfaceRaised }]}>
            <Text style={[styles.mediaBadgeText, { color: accents.primary }]}>{product.category}</Text>
          </View>
          <View style={[styles.mediaTrendChip, { backgroundColor: `${accents.secondary}20` }]}>
            <Text style={[styles.mediaTrendText, { color: accents.secondary }]}>Hot listing</Text>
          </View>
        </View>
        <Pressable
          onPress={(event) => {
            event.stopPropagation();
            const sellerId = product.seller._id ?? product.seller.id;

            if (sellerId) {
              router.push({ pathname: '/profile/[id]', params: { id: sellerId } });
            }
          }}
          style={styles.sellerRow}>
          <SocialAvatar name={product.seller.name} imageUrl={product.seller.avatarUrl} size={28} />
          <Text style={[styles.mediaMeta, { color: palette.text }]}>
            {product.seller.name} - {product.location}
          </Text>
          <Feather name="chevron-right" size={16} color={palette.muted} />
        </Pressable>
      </View>

      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.name, { color: palette.text }]}>{product.name}</Text>
          <Text style={[styles.description, { color: palette.muted }]}>{product.description}</Text>
        </View>
        <View style={styles.priceStack}>
          <Text style={[styles.price, { color: palette.text }]}>{formatCurrency(product.price)}</Text>
          <Text style={[styles.unit, { color: palette.muted }]}>per {product.unit}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={[styles.stockChip, { backgroundColor: `${palette.success}18` }]}>
          <Text style={[styles.stock, { color: palette.success }]}>
            {product.stock} {product.unit} in stock
          </Text>
        </View>
        <Text style={[styles.cta, { color: accents.primary }]}>Open listing</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 12,
    gap: 12,
  },
  media: {
    borderRadius: 18,
    padding: 14,
    minHeight: 126,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  mediaBlobPrimary: {
    position: 'absolute',
    right: -12,
    top: -18,
    width: 110,
    height: 110,
    borderRadius: 999,
  },
  mediaBlobSecondary: {
    position: 'absolute',
    left: -10,
    bottom: -18,
    width: 92,
    height: 92,
    borderRadius: 999,
  },
  mediaTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  mediaBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  mediaBadgeText: {
    fontFamily: Fonts.rounded,
    fontSize: 12,
    fontWeight: '700',
  },
  mediaTrendChip: {
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  mediaTrendText: {
    fontFamily: Fonts.rounded,
    fontSize: 11,
    fontWeight: '700',
  },
  mediaMeta: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
  },
  headerText: {
    flex: 1,
    gap: 6,
  },
  name: {
    fontFamily: Fonts.rounded,
    fontSize: 17,
    fontWeight: '700',
  },
  description: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 21,
  },
  priceStack: {
    alignItems: 'flex-end',
    gap: 2,
  },
  price: {
    fontFamily: Fonts.rounded,
    fontSize: 17,
    fontWeight: '700',
  },
  unit: {
    fontFamily: Fonts.sans,
    fontSize: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  stockChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  stock: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    fontWeight: '700',
  },
  cta: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    fontWeight: '700',
  },
});
