import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ReviewSheet } from '@/components/orders/review-sheet';
import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/ui/avatar';
import { OrderStatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TabHeader } from '@/components/ui/screen-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { ListSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/state-views';
import { ScreenPadding, Spacing } from '@/constants/theme';
import { useOrders, usePullToRefresh, useRefreshOnFocus } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import type { Order } from '@/lib/types';
import { useSession } from '@/providers/session-provider';
import { formatCurrency, formatRelativeTime } from '@/utils/format';

type Scope = 'buyer' | 'seller';

const scopes = [
  { value: 'buyer', label: 'Purchases' },
  { value: 'seller', label: 'Sales' },
] as const;

export default function OrdersScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { token } = useSession();
  const [scope, setScope] = useState<Scope>('buyer');
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const orders = useOrders(scope);

  useRefreshOnFocus(orders.refetch);
  const { refreshing, onRefresh } = usePullToRefresh(orders.refetch);

  if (!token) {
    return (
      <View style={[styles.screen, styles.guest, { paddingTop: insets.top + Spacing.md, backgroundColor: colors.background }]}>
        <TabHeader title="Orders" />
        <EmptyState
          icon="lock"
          title="Sign in to track orders"
          body="Request produce from farmers and follow each order from request to delivery."
          action={{ label: 'Sign in', onPress: () => router.push('/auth?mode=login') }}
        />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlatList
        data={orders.data ?? []}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <OrderCard order={item} scope={scope} onComplete={setReviewOrder} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <TabHeader title="Orders" subtitle="Track requests from first message to delivery." />
            <SegmentedControl options={scopes} value={scope} onChange={setScope} />
          </View>
        }
        ListEmptyComponent={
          orders.isPending ? (
            <ListSkeleton count={2} />
          ) : orders.isError ? (
            <ErrorState error={orders.error} onRetry={() => void orders.refetch()} retrying={orders.isFetching} />
          ) : scope === 'buyer' ? (
            <EmptyState
              icon="shopping-bag"
              title="No purchases yet"
              body="When you request produce in the Market, it will show up here."
              action={{ label: 'Browse the market', onPress: () => router.push('/(tabs)/marketplace') }}
            />
          ) : (
            <EmptyState icon="truck" title="No sales yet" body="Buyer requests for your listings will appear here." />
          )
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}
        showsVerticalScrollIndicator={false}
      />
      <ReviewSheet order={reviewOrder} onClose={() => setReviewOrder(null)} />
    </View>
  );
}

function OrderCard({ order, scope, onComplete }: { order: Order; scope: Scope; onComplete: (order: Order) => void }) {
  const counterparty = scope === 'buyer' ? order.seller : order.buyer;
  const item = order.items[0];
  const canComplete = scope === 'buyer' && !['delivered', 'cancelled'].includes(order.status);

  return (
    <Card onPress={() => router.push({ pathname: '/order/[id]', params: { id: order._id } })}>
      <View style={styles.cardTop}>
        <View style={styles.cardTitle}>
          <AppText variant="subhead" numberOfLines={1}>
            {item ? `${item.quantity} ${item.unit} ${item.name}` : `Order ${order._id.slice(-6)}`}
          </AppText>
          <AppText variant="caption" color="textMuted">
            #{order._id.slice(-6).toUpperCase()} · {formatRelativeTime(order.createdAt)}
          </AppText>
        </View>
        <OrderStatusBadge status={order.status} />
      </View>

      <View style={styles.party}>
        <Avatar name={counterparty.name} imageUrl={counterparty.avatarUrl} size={28} />
        <AppText variant="callout" color="textMuted" numberOfLines={1} style={styles.partyName}>
          {scope === 'buyer' ? 'From' : 'For'} {counterparty.name}
        </AppText>
        <AppText variant="bodyStrong">{formatCurrency(order.totalAmount)}</AppText>
      </View>

      {canComplete ? (
        <Button label="Confirm delivery" icon="check-circle" variant="secondary" size="sm" onPress={() => onComplete(order)} />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  guest: { paddingHorizontal: ScreenPadding },
  content: { paddingHorizontal: ScreenPadding, paddingBottom: Spacing.xxl, gap: Spacing.sm },
  header: { gap: Spacing.md, paddingBottom: Spacing.xs },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  cardTitle: { flex: 1, gap: 2 },
  party: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  partyName: { flex: 1 },
});
