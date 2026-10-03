import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';

import { ReviewSheet } from '@/components/orders/review-sheet';
import { AppText } from '@/components/ui/app-text';
import { OrderStatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ListRow } from '@/components/ui/list-row';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Section } from '@/components/ui/section';
import { ListSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/state-views';
import { Radius, ScreenPadding, Spacing } from '@/constants/theme';
import { queryKeys, useOrder } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import { api, getErrorMessage } from '@/lib/api';
import type { Order, SellerRemark } from '@/lib/types';
import { useSession } from '@/providers/session-provider';
import { useToast } from '@/providers/toast-provider';
import { formatCurrency } from '@/utils/format';
import { describeUser, getUserId, openProfile } from '@/utils/user';

const steps = [
  { status: 'pending', title: 'Requested', body: 'The buyer sent the request.' },
  { status: 'accepted', title: 'Accepted', body: 'The seller confirmed stock and delivery.' },
  { status: 'in-transit', title: 'On the way', body: 'The order has been dispatched.' },
  { status: 'delivered', title: 'Delivered', body: 'The buyer confirmed delivery and reviewed the seller.' },
] as const;

type StatusUpdate = 'accepted' | 'in-transit' | 'cancelled';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const order = useOrder(id);

  return (
    <View style={styles.screen}>
      <ScreenHeader title={id ? `Order #${id.slice(-6).toUpperCase()}` : 'Order'} />
      {order.isPending ? (
        <View style={styles.content}>
          <ListSkeleton count={2} />
        </View>
      ) : order.isError ? (
        <ErrorState error={order.error} onRetry={() => void order.refetch()} retrying={order.isFetching} />
      ) : !order.data?.item ? (
        <EmptyState icon="file-text" title="Order not found" />
      ) : (
        <OrderBody order={order.data.item} remark={order.data.remark} />
      )}
    </View>
  );
}

function OrderBody({ order, remark }: { order: Order; remark: SellerRemark | null }) {
  const { colors } = useTheme();
  const { token, user } = useSession();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [pendingStatus, setPendingStatus] = useState<StatusUpdate | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const viewerId = getUserId(user);
  const isBuyer = viewerId === getUserId(order.buyer);
  const isSeller = viewerId === getUserId(order.seller);
  const isClosed = order.status === 'delivered' || order.status === 'cancelled';
  const item = order.items[0];
  const sellerPhone = order.seller.phone?.trim();
  const sellerIsVerified = order.seller.verificationStatus === 'verified' || order.seller.verificationStatus === 'top-rated';
  const activeStep = steps.findIndex((step) => step.status === order.status);

  async function updateStatus(status: StatusUpdate) {
    if (!token) {
      return;
    }

    setPendingStatus(status);

    try {
      const response = await api.updateOrderStatus(token, order._id, status);
      queryClient.setQueryData(queryKeys.order(order._id), { item: response.item, remark: response.remark });
      void queryClient.invalidateQueries({ queryKey: queryKeys.ordersRoot });
      showToast(response.message);
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
    } finally {
      setPendingStatus(null);
    }
  }

  function confirmCancel() {
    Alert.alert('Cancel this order?', `${isBuyer ? order.seller.name : order.buyer.name} will be notified. This can't be undone.`, [
      { text: 'Keep order', style: 'cancel' },
      { text: 'Cancel order', style: 'destructive', onPress: () => void updateStatus('cancelled') },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Card>
        <View style={styles.summaryTop}>
          <AppText variant="headline" style={styles.flex}>
            {item ? `${item.quantity} ${item.unit} ${item.name}` : 'Order'}
          </AppText>
          <OrderStatusBadge status={order.status} />
        </View>
        <AppText variant="title">{formatCurrency(order.totalAmount)}</AppText>
        <AppText variant="caption" color="textMuted">
          {item ? `${formatCurrency(item.unitPrice)} per ${item.unit} · ` : ''}Paid directly to the seller, not in the app
        </AppText>
      </Card>

      {!isClosed && (isBuyer || isSeller) ? (
        <View style={styles.actions}>
          {isSeller && order.status === 'pending' ? (
            <Button label="Accept order" icon="check" onPress={() => void updateStatus('accepted')} loading={pendingStatus === 'accepted'} fullWidth />
          ) : null}
          {isSeller && order.status === 'accepted' ? (
            <Button label="Mark as dispatched" icon="truck" onPress={() => void updateStatus('in-transit')} loading={pendingStatus === 'in-transit'} fullWidth />
          ) : null}
          {isBuyer && !remark ? <Button label="Confirm delivery" icon="check-circle" onPress={() => setIsReviewOpen(true)} fullWidth /> : null}
          {isSeller || order.status === 'pending' ? (
            <Button label="Cancel order" variant="danger" onPress={confirmCancel} loading={pendingStatus === 'cancelled'} fullWidth />
          ) : null}
        </View>
      ) : null}

      <Section title="Progress">
        {order.status === 'cancelled' ? (
          <Card tone="dangerSoft" style={styles.cancelled}>
            <Feather name="x-circle" size={18} color={colors.danger} />
            <AppText variant="label" color="danger">
              This order was cancelled.
            </AppText>
          </Card>
        ) : (
          <View>
            {steps.map((step, index) => {
              const isDone = index <= activeStep;
              const isLast = index === steps.length - 1;

              return (
                <View key={step.status} style={styles.step}>
                  <View style={styles.stepRail}>
                    <View style={[styles.stepDot, { backgroundColor: isDone ? colors.primary : colors.surface, borderColor: isDone ? colors.primary : colors.border }]}>
                      {isDone ? <Ionicons name="checkmark" size={12} color={colors.onPrimary} /> : null}
                    </View>
                    {!isLast ? <View style={[styles.stepLine, { backgroundColor: index < activeStep ? colors.primary : colors.border }]} /> : null}
                  </View>
                  <View style={styles.stepCopy}>
                    <AppText variant="label" color={isDone ? 'text' : 'textMuted'}>
                      {step.title}
                    </AppText>
                    <AppText variant="caption" color="textMuted">
                      {step.body}
                    </AppText>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </Section>

      <Section title="People">
        <Card padded={false} style={styles.listCard}>
          {[
            { label: 'Seller', person: order.seller },
            { label: 'Buyer', person: order.buyer },
          ].map(({ label, person }) => (
            <ListRow
              key={label}
              avatar={{ name: person.name, imageUrl: person.avatarUrl }}
              title={getUserId(person) === viewerId ? `${person.name} (you)` : person.name}
              subtitle={describeUser({ role: label, location: person.location })}
              onPress={() => openProfile(person)}
            />
          ))}
        </Card>
        {sellerIsVerified && sellerPhone && !isSeller ? (
          <Button
            label={`Call ${order.seller.name.split(' ')[0]}`}
            icon="phone"
            variant="secondary"
            onPress={() => void Linking.openURL(`tel:${sellerPhone.replace(/\s/g, '')}`)}
          />
        ) : null}
      </Section>

      <Section title="Delivery">
        <Card style={styles.details}>
          <DetailRow icon="map-pin" label="Deliver to" value={order.deliveryLocation || 'Not provided'} />
          <DetailRow icon="phone" label="Buyer contact" value={order.deliveryContact || 'Not provided'} />
          <DetailRow icon="clock" label="Expected" value={order.etaLabel || 'Being confirmed'} />
          {order.note ? <DetailRow icon="message-square" label="Note" value={order.note} /> : null}
        </Card>
      </Section>

      {remark ? (
        <Section title="Buyer's review">
          <Card>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((value) => (
                <Ionicons key={value} name={value <= remark.rating ? 'star' : 'star-outline'} size={16} color={colors.accent} />
              ))}
            </View>
            <AppText variant="callout">{remark.body}</AppText>
            <AppText variant="caption" color="textMuted">
              — {remark.buyer.name}
            </AppText>
          </Card>
        </Section>
      ) : null}

      <ReviewSheet order={isReviewOpen ? order : null} onClose={() => setIsReviewOpen(false)} />
    </ScrollView>
  );
}

function DetailRow({ icon, label, value }: { icon: keyof typeof Feather.glyphMap; label: string; value: string }) {
  const { colors } = useTheme();

  return (
    <View style={styles.detailRow}>
      <Feather name={icon} size={16} color={colors.textSubtle} style={styles.detailIcon} />
      <View style={styles.flex}>
        <AppText variant="caption" color="textMuted">
          {label}
        </AppText>
        <AppText variant="callout">{value}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: ScreenPadding, paddingTop: Spacing.xs, paddingBottom: Spacing.xxl, gap: Spacing.lg },
  flex: { flex: 1 },
  summaryTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  actions: { gap: Spacing.xs },
  cancelled: { flexDirection: 'row', alignItems: 'center' },
  step: { flexDirection: 'row', gap: Spacing.sm },
  stepRail: { alignItems: 'center', width: 22 },
  stepDot: { width: 22, height: 22, borderRadius: Radius.pill, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  stepLine: { width: 2, flex: 1, minHeight: 18, marginVertical: 2 },
  stepCopy: { flex: 1, gap: 2, paddingBottom: Spacing.md },
  listCard: { paddingHorizontal: Spacing.sm, gap: 0 },
  details: { gap: Spacing.md },
  detailRow: { flexDirection: 'row', gap: Spacing.sm },
  detailIcon: { marginTop: 2 },
  stars: { flexDirection: 'row', gap: 2 },
});
