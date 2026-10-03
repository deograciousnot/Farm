import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Product } from '@/lib/types';
import { formatCurrency } from '@/utils/format';

const categoryIcons: Record<string, keyof typeof Feather.glyphMap> = {
  Vegetables: 'feather',
  Fruits: 'sun',
  Grains: 'layers',
  Dairy: 'droplet',
  Fish: 'anchor',
  'Farm inputs': 'tool',
};

export const ProductCard = memo(function ProductCard({ product }: { product: Product }) {
  const { colors } = useTheme();
  const image = product.mediaUrls?.[0];
  const isOutOfStock = product.stock <= 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, ${formatCurrency(product.price)} per ${product.unit}`}
      onPress={() => router.push({ pathname: '/product/[id]', params: { id: product._id } })}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={[styles.media, { backgroundColor: colors.surfaceMuted }]}>
        {image ? (
          <Image source={{ uri: image }} contentFit="cover" transition={150} style={StyleSheet.absoluteFill} />
        ) : (
          <Feather name={categoryIcons[product.category] ?? 'package'} size={28} color={colors.textSubtle} />
        )}
        {isOutOfStock ? (
          <View style={styles.mediaBadge}>
            <Badge label="Sold out" tone="danger" />
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <AppText variant="label" numberOfLines={2} style={styles.name}>
          {product.name}
        </AppText>
        <AppText variant="bodyStrong">
          {formatCurrency(product.price)}
          <AppText variant="caption" color="textMuted">
            {' '}
            / {product.unit}
          </AppText>
        </AppText>
        <View style={styles.seller}>
          <Avatar name={product.seller.name} imageUrl={product.seller.avatarUrl} size={18} />
          <AppText variant="caption" color="textMuted" numberOfLines={1} style={styles.sellerText}>
            {product.location}
          </AppText>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: { flex: 1, gap: Spacing.xs },
  pressed: { opacity: 0.8 },
  media: {
    aspectRatio: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaBadge: { position: 'absolute', top: Spacing.xs, left: Spacing.xs },
  body: { gap: 2 },
  name: { minHeight: 36 },
  seller: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  sellerText: { flex: 1 },
});
