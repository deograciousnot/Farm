import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { FeedPost } from '@/lib/types';
import { formatCurrency } from '@/utils/format';

type LinkedListingCardProps = {
  product: NonNullable<FeedPost['linkedProduct']>;
};

/** A marketplace listing tagged in a post. */
export function LinkedListingCard({ product }: LinkedListingCardProps) {
  const { colors } = useTheme();

  return (
    <Card
      tone="surfaceMuted"
      onPress={() => router.push({ pathname: '/product/[id]', params: { id: product._id } })}
      style={styles.card}>
      <View style={[styles.icon, { backgroundColor: colors.surface }]}>
        <Feather name="shopping-bag" size={17} color={colors.accent} />
      </View>
      <View style={styles.copy}>
        <AppText variant="label" numberOfLines={1}>
          {product.name}
        </AppText>
        <AppText variant="caption" color="textMuted" numberOfLines={1}>
          {formatCurrency(product.price)} / {product.unit} · {product.location}
        </AppText>
      </View>
      <Feather name="chevron-right" size={18} color={colors.textSubtle} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', padding: Spacing.sm },
  icon: { width: 36, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 2 },
});
