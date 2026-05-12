import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SocialAvatar } from '@/components/social-avatar';
import { StatusPill } from '@/components/status-pill';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { api } from '@/lib/api';
import type { Order } from '@/lib/types';
import { useSession } from '@/providers/session-provider';
import { formatCurrency } from '@/utils/format';

export default function OrdersScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const insets = useSafeAreaInsets();
  const { token, isLoading: isSessionLoading } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [scope, setScope] = useState<'buyer' | 'seller'>('buyer');
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [remarkDraft, setRemarkDraft] = useState('');
  const [ratingDraft, setRatingDraft] = useState(5);
  const [isCompletingOrder, setIsCompletingOrder] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      const authToken = token;
      let isMounted = true;

      async function loadOrders() {
        setIsLoading(true);

        try {
          const response = await api.getOrders(authToken, scope);

          if (!isMounted) {
            return;
          }

          setOrders(response.items);
        } catch (error) {
          console.warn('Failed to load orders.', error);
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      }

      void loadOrders();

      return () => {
        isMounted = false;
      };
    }, [scope, token])
  );

  const showLoading = Boolean(token) && (isSessionLoading || isLoading);

  const header = useMemo(
    () => (
      <>
      <View style={[styles.heroCard, { backgroundColor: palette.surfaceRaised, borderColor: palette.border }]}>
        <Text style={[styles.heading, { color: palette.text }]}>Orders</Text>
        <Text style={[styles.subheading, { color: palette.muted }]}>
          Cleaner status tracking with buyer, seller, delivery, and payment context kept close.
        </Text>

        {token ? (
          <View style={[styles.scopeSwitch, { backgroundColor: palette.surface }]}>
            <Pressable
              onPress={() => setScope('buyer')}
              style={[styles.scopeChip, { backgroundColor: scope === 'buyer' ? palette.tint : 'transparent' }]}>
              <Text style={[styles.scopeChipText, { color: scope === 'buyer' ? '#ffffff' : palette.text }]}>
                My purchases
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setScope('seller')}
              style={[styles.scopeChip, { backgroundColor: scope === 'seller' ? palette.accent : 'transparent' }]}>
              <Text style={[styles.scopeChipText, { color: scope === 'seller' ? '#ffffff' : palette.text }]}>
                Sales
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {!token ? (
        <View style={[styles.lockedCard, { backgroundColor: palette.surfaceRaised, borderColor: palette.border }]}>
          <Text style={[styles.lockedTitle, { color: palette.text }]}>Orders unlock after sign-in</Text>
          <Text style={[styles.lockedCopy, { color: palette.muted }]}>
            Guests can browse the social side of FarmConnect, but live orders stay tied to authenticated accounts.
          </Text>
        </View>
      ) : null}

      {showLoading ? (
        <View style={styles.loadingShell}>
          <ActivityIndicator color={palette.tint} />
        </View>
      ) : null}

      {!showLoading && token && !orders.length ? (
        <View style={[styles.lockedCard, { backgroundColor: palette.surfaceRaised, borderColor: palette.border }]}>
          <Text style={[styles.lockedTitle, { color: palette.text }]}>
            {scope === 'buyer' ? 'No purchases yet' : 'No incoming sales yet'}
          </Text>
          <Text style={[styles.lockedCopy, { color: palette.muted }]}>
            {scope === 'buyer'
              ? 'Place your first marketplace order and it will show up here.'
              : 'Once buyers order your listings, seller-side activity will show here.'}
          </Text>
        </View>
      ) : null}
      </>
    ),
    [orders.length, palette, scope, showLoading, token]
  );

  const renderOrder = useCallback(
    ({ item: order }: { item: Order }) => {
        const counterparty = scope === 'buyer' ? order.seller : order.buyer;
        const canComplete = scope === 'buyer' && order.status !== 'delivered' && order.status !== 'cancelled';

        return (
          <Pressable
            onPress={() => router.push({ pathname: '/order/[id]', params: { id: order._id } })}
            key={order._id}
            style={[styles.orderCard, { backgroundColor: palette.surfaceRaised, borderColor: palette.border }]}>
            <View style={styles.orderHeader}>
              <View style={styles.orderHeaderText}>
                <Text style={[styles.orderId, { color: palette.text }]}>Order {order._id.slice(-6)}</Text>
                <Text style={[styles.orderMeta, { color: palette.muted }]}>ETA {order.etaLabel}</Text>
              </View>
              <StatusPill
                label={order.status.replace('-', ' ')}
                tone={order.status === 'delivered' ? 'success' : 'warning'}
              />
            </View>

            <View style={styles.partyRow}>
              <View style={styles.party}>
                <SocialAvatar name={counterparty.name} imageUrl={counterparty.avatarUrl} size={34} />
                <View>
                  <Text style={[styles.partyName, { color: palette.text }]}>{counterparty.name}</Text>
                  <Text style={[styles.partyMeta, { color: palette.muted }]}>
                    {scope === 'buyer' ? 'Seller' : 'Buyer'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.total, { color: palette.text }]}>{formatCurrency(order.totalAmount)}</Text>
            </View>

            <View style={styles.orderBody}>
              <Text style={[styles.orderBodyStrong, { color: palette.text }]}>
                {order.items[0]?.quantity} {order.items[0]?.unit} of {order.items[0]?.name}
              </Text>
              {order.deliveryLocation ? (
                <Text style={[styles.orderBodyText, { color: palette.muted }]}>Delivery to {order.deliveryLocation}</Text>
              ) : null}
              {order.note ? <Text style={[styles.orderBodyText, { color: palette.muted }]}>{order.note}</Text> : null}
            </View>

            {canComplete ? (
              <Pressable
                onPress={(event) => {
                  event.stopPropagation();
                  setReviewOrder(order);
                  setRatingDraft(5);
                  setRemarkDraft('');
                }}
                style={[styles.completeButton, { backgroundColor: `${palette.tint}18` }]}>
                <Text style={[styles.completeButtonText, { color: palette.tint }]}>Complete order and review seller</Text>
              </Pressable>
            ) : null}
          </Pressable>
        );
    },
    [palette, scope]
  );

  async function handleCompleteOrder() {
    if (!token || !reviewOrder) {
      return;
    }

    const body = remarkDraft.trim();

    if (!body) {
      Alert.alert('Remark needed', 'Leave a short note about the seller before completing the order.');
      return;
    }

    setIsCompletingOrder(true);

    try {
      const response = await api.completeOrderWithRemark(token, reviewOrder._id, {
        rating: ratingDraft,
        body,
      });
      setOrders((current) => current.map((order) => (order._id === response.item._id ? response.item : order)));
      setReviewOrder(null);
      setRemarkDraft('');
      Alert.alert('Order completed', response.message);
    } catch (error) {
      Alert.alert('Could not complete order', error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setIsCompletingOrder(false);
    }
  }

  return (
    <>
      <FlatList
        data={orders}
        keyExtractor={(item) => item._id}
        renderItem={renderOrder}
        style={[styles.screen, { backgroundColor: palette.background }]}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14 }]}
        ListHeaderComponent={header}
        showsVerticalScrollIndicator={false}
      />

      <Modal visible={Boolean(reviewOrder)} animationType="fade" transparent onRequestClose={() => setReviewOrder(null)}>
        <View style={styles.modalRoot}>
          <Pressable style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.28)' }]} onPress={() => setReviewOrder(null)} />
          <View style={[styles.reviewPanel, { backgroundColor: palette.surfaceRaised, borderColor: palette.border }]}>
            <Text style={[styles.reviewTitle, { color: palette.text }]}>Seller remark</Text>
            <Text style={[styles.reviewCopy, { color: palette.muted }]}>
              This completes the order and adds your public remark to the seller profile.
            </Text>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setRatingDraft(value)}
                  style={[styles.ratingButton, { backgroundColor: value <= ratingDraft ? palette.tint : palette.surface }]}>
                  <Text style={[styles.ratingText, { color: value <= ratingDraft ? '#ffffff' : palette.text }]}>{value}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={remarkDraft}
              onChangeText={setRemarkDraft}
              placeholder="How was quality, timing, packaging, and communication?"
              placeholderTextColor={palette.muted}
              multiline
              style={[styles.reviewInput, { backgroundColor: palette.surface, color: palette.text, borderColor: palette.border }]}
            />
            <View style={styles.reviewActions}>
              <Pressable onPress={() => setReviewOrder(null)} style={[styles.reviewSecondary, { backgroundColor: palette.surface }]}>
                <Text style={[styles.reviewActionText, { color: palette.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => void handleCompleteOrder()}
                disabled={isCompletingOrder}
                style={[styles.reviewPrimary, { backgroundColor: palette.tint, opacity: isCompletingOrder ? 0.65 : 1 }]}>
                <Text style={styles.reviewPrimaryText}>{isCompletingOrder ? 'Saving...' : 'Complete'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 18, gap: 14, paddingBottom: 36 },
  heroCard: { borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, padding: 18, gap: 10 },
  heading: { fontFamily: Fonts.rounded, fontSize: 30, fontWeight: '700' },
  subheading: { fontFamily: Fonts.sans, fontSize: 15, lineHeight: 22 },
  scopeSwitch: { borderRadius: 999, padding: 4, flexDirection: 'row', gap: 6, alignSelf: 'flex-start' },
  scopeChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 10 },
  scopeChipText: { fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '700' },
  lockedCard: { borderRadius: 22, borderWidth: 1, padding: 18, gap: 8 },
  lockedTitle: { fontFamily: Fonts.rounded, fontSize: 18, fontWeight: '700' },
  lockedCopy: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 21 },
  loadingShell: { alignItems: 'center', paddingVertical: 8 },
  orderCard: { borderRadius: 22, borderWidth: 1, padding: 16, gap: 16 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  orderHeaderText: { flex: 1 },
  orderId: { fontFamily: Fonts.rounded, fontSize: 17, fontWeight: '700' },
  orderMeta: { fontFamily: Fonts.sans, fontSize: 13, marginTop: 4 },
  partyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  party: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  partyName: { fontFamily: Fonts.rounded, fontSize: 14, fontWeight: '700' },
  partyMeta: { fontFamily: Fonts.sans, fontSize: 12 },
  total: { fontFamily: Fonts.rounded, fontSize: 16, fontWeight: '700' },
  orderBody: { gap: 6 },
  orderBodyStrong: { fontFamily: Fonts.rounded, fontSize: 14, fontWeight: '700' },
  orderBodyText: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 21 },
  completeButton: { borderRadius: 999, alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  completeButtonText: { fontFamily: Fonts.rounded, fontSize: 13, fontWeight: '800' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalOverlay: { ...StyleSheet.absoluteFillObject },
  reviewPanel: { margin: 14, borderRadius: 28, borderWidth: StyleSheet.hairlineWidth, padding: 18, gap: 12 },
  reviewTitle: { fontFamily: Fonts.rounded, fontSize: 22, fontWeight: '800' },
  reviewCopy: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20 },
  ratingRow: { flexDirection: 'row', gap: 8 },
  ratingButton: { width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  ratingText: { fontFamily: Fonts.rounded, fontSize: 14, fontWeight: '800' },
  reviewInput: {
    minHeight: 104,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: 'top',
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  reviewActions: { flexDirection: 'row', gap: 10 },
  reviewSecondary: { flex: 1, borderRadius: 16, alignItems: 'center', paddingVertical: 13 },
  reviewPrimary: { flex: 1, borderRadius: 16, alignItems: 'center', paddingVertical: 13 },
  reviewActionText: { fontFamily: Fonts.rounded, fontSize: 13, fontWeight: '800' },
  reviewPrimaryText: { color: '#ffffff', fontFamily: Fonts.rounded, fontSize: 13, fontWeight: '800' },
});
