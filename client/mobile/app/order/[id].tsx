import Feather from '@expo/vector-icons/Feather';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SocialAvatar } from '@/components/social-avatar';
import { StatusPill } from '@/components/status-pill';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { api } from '@/lib/api';
import type { Order, SellerRemark } from '@/lib/types';
import { useSession } from '@/providers/session-provider';
import { formatCurrency } from '@/utils/format';

const statusSteps = ['pending', 'accepted', 'in-transit', 'delivered'] as const;

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { token, user } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [remark, setRemark] = useState<SellerRemark | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [remarkDraft, setRemarkDraft] = useState('');
  const [ratingDraft, setRatingDraft] = useState(5);
  const [isCompletingOrder, setIsCompletingOrder] = useState(false);

  const currentUserId = user?._id ?? user?.id;
  const isBuyer = Boolean(order && currentUserId && (order.buyer._id ?? order.buyer.id) === currentUserId);
  const isSeller = Boolean(order && currentUserId && (order.seller._id ?? order.seller.id) === currentUserId);
  const counterparty = order ? (isBuyer ? order.seller : order.buyer) : null;

  const loadOrder = useCallback(async () => {
    if (!token || !id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.getOrderById(token, id);
      setOrder(response.item);
      setRemark(response.remark);
    } catch (error) {
      Alert.alert('Order not found', error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  const timeline = useMemo(() => {
    if (!order) {
      return [];
    }

    const activeIndex = order.status === 'cancelled' ? -1 : statusSteps.indexOf(order.status as never);

    return statusSteps.map((status, index) => ({
      status,
      complete: activeIndex >= index,
      active: activeIndex === index,
    }));
  }, [order]);

  async function handleStatusUpdate(status: 'accepted' | 'in-transit' | 'cancelled') {
    if (!token || !order) {
      return;
    }

    setIsUpdatingStatus(true);

    try {
      const response = await api.updateOrderStatus(token, order._id, status);
      setOrder(response.item);
      setRemark(response.remark);
      Alert.alert('Order updated', response.message);
    } catch (error) {
      Alert.alert('Update failed', error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  async function handleCompleteOrder() {
    if (!token || !order) {
      return;
    }

    const body = remarkDraft.trim();

    if (!body) {
      Alert.alert('Remark needed', 'Leave a short note about the seller before completing the order.');
      return;
    }

    setIsCompletingOrder(true);

    try {
      const response = await api.completeOrderWithRemark(token, order._id, {
        rating: ratingDraft,
        body,
      });
      setOrder(response.item);
      setRemark(response.remark);
      setIsReviewOpen(false);
      setRemarkDraft('');
      Alert.alert('Order completed', response.message);
    } catch (error) {
      Alert.alert('Could not complete order', error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setIsCompletingOrder(false);
    }
  }

  const canAccept = isSeller && order?.status === 'pending';
  const canDispatch = isSeller && order?.status === 'accepted';
  const canBuyerCancel = isBuyer && order?.status === 'pending';
  const canSellerCancel = isSeller && order && !['delivered', 'cancelled'].includes(order.status);
  const canComplete = isBuyer && order && !remark && !['delivered', 'cancelled'].includes(order.status);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={[styles.iconButton, { backgroundColor: palette.surface }]}>
            <Feather name="arrow-left" size={18} color={palette.text} />
          </Pressable>
          <Text style={[styles.topTitle, { color: palette.text }]}>Order detail</Text>
          <View style={styles.iconButtonSpacer} />
        </View>

        {isLoading ? (
          <View style={styles.loadingShell}>
            <ActivityIndicator color={palette.tint} />
          </View>
        ) : order ? (
          <>
            <View style={[styles.heroCard, { backgroundColor: palette.surfaceRaised, borderColor: palette.border }]}>
              <View style={styles.heroHeader}>
                <View style={styles.heroTitleWrap}>
                  <Text style={[styles.eyebrow, { color: palette.tint }]}>Order {order._id.slice(-6)}</Text>
                  <Text style={[styles.heroTitle, { color: palette.text }]}>
                    {order.items[0]?.quantity} {order.items[0]?.unit} of {order.items[0]?.name}
                  </Text>
                </View>
                <StatusPill label={order.status.replace('-', ' ')} tone={order.status === 'delivered' ? 'success' : 'warning'} />
              </View>
              <View style={[styles.totalCard, { backgroundColor: palette.surface }]}>
                <Text style={[styles.totalLabel, { color: palette.muted }]}>Total</Text>
                <Text style={[styles.totalValue, { color: palette.text }]}>{formatCurrency(order.totalAmount)}</Text>
              </View>
            </View>

            <View style={[styles.sectionCard, { backgroundColor: palette.surfaceRaised, borderColor: palette.border }]}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Timeline</Text>
              {order.status === 'cancelled' ? (
                <View style={[styles.cancelledRow, { backgroundColor: `${palette.accent}14` }]}>
                  <Feather name="x-circle" size={16} color={palette.accent} />
                  <Text style={[styles.cancelledText, { color: palette.accent }]}>This order was cancelled.</Text>
                </View>
              ) : (
                <View style={styles.timeline}>
                  {timeline.map((step) => (
                    <View key={step.status} style={styles.timelineRow}>
                      <View
                        style={[
                          styles.timelineDot,
                          { backgroundColor: step.complete ? palette.tint : palette.surface, borderColor: step.complete ? palette.tint : palette.border },
                        ]}
                      />
                      <View style={styles.timelineTextWrap}>
                        <Text style={[styles.timelineTitle, { color: step.active ? palette.text : palette.muted }]}>
                          {step.status.replace('-', ' ')}
                        </Text>
                        <Text style={[styles.timelineBody, { color: palette.muted }]}>
                          {step.status === 'pending'
                            ? 'Buyer placed the order.'
                            : step.status === 'accepted'
                              ? 'Seller confirms stock and delivery.'
                              : step.status === 'in-transit'
                                ? 'Dispatch or delivery is underway.'
                                : 'Buyer completes the order with a seller remark.'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={[styles.sectionCard, { backgroundColor: palette.surfaceRaised, borderColor: palette.border }]}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>People</Text>
              <PartyRow label="Buyer" person={order.buyer} palette={palette} />
              <PartyRow label="Seller" person={order.seller} palette={palette} />
              {counterparty ? (
                <Text style={[styles.contextLine, { color: palette.muted }]}>
                  You are viewing this as the {isBuyer ? 'buyer' : 'seller'}.
                </Text>
              ) : null}
            </View>

            <View style={[styles.sectionCard, { backgroundColor: palette.surfaceRaised, borderColor: palette.border }]}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Delivery context</Text>
              <InfoRow label="Location" value={order.deliveryLocation || 'Not provided'} palette={palette} />
              <InfoRow label="Contact" value={order.deliveryContact || 'Not provided'} palette={palette} />
              <InfoRow label="ETA" value={order.etaLabel || 'Confirming'} palette={palette} />
              {order.note ? <InfoRow label="Note" value={order.note} palette={palette} /> : null}
            </View>

            <View style={[styles.sectionCard, { backgroundColor: palette.surfaceRaised, borderColor: palette.border }]}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Actions</Text>
              <View style={styles.actionGrid}>
                {canAccept ? (
                  <OrderAction label="Accept order" icon="check" palette={palette} onPress={() => void handleStatusUpdate('accepted')} disabled={isUpdatingStatus} />
                ) : null}
                {canDispatch ? (
                  <OrderAction label="Mark in transit" icon="truck" palette={palette} onPress={() => void handleStatusUpdate('in-transit')} disabled={isUpdatingStatus} />
                ) : null}
                {canComplete ? (
                  <OrderAction
                    label="Complete + remark"
                    icon="star"
                    palette={palette}
                    onPress={() => {
                      setRatingDraft(5);
                      setRemarkDraft('');
                      setIsReviewOpen(true);
                    }}
                    disabled={isCompletingOrder}
                  />
                ) : null}
                {canBuyerCancel || canSellerCancel ? (
                  <OrderAction label="Cancel order" icon="x" palette={palette} tone="danger" onPress={() => void handleStatusUpdate('cancelled')} disabled={isUpdatingStatus} />
                ) : null}
                {!canAccept && !canDispatch && !canComplete && !canBuyerCancel && !canSellerCancel ? (
                  <Text style={[styles.contextLine, { color: palette.muted }]}>No actions are available for this order right now.</Text>
                ) : null}
              </View>
            </View>

            <View style={[styles.sectionCard, { backgroundColor: palette.surfaceRaised, borderColor: palette.border }]}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Seller remark</Text>
              {remark ? (
                <View style={[styles.remarkCard, { backgroundColor: palette.surface }]}>
                  <View style={styles.remarkTop}>
                    <SocialAvatar name={remark.buyer.name} imageUrl={remark.buyer.avatarUrl} size={36} />
                    <View style={styles.remarkCopy}>
                      <Text style={[styles.remarkName, { color: palette.text }]}>{remark.buyer.name}</Text>
                      <Text style={[styles.remarkMeta, { color: palette.muted }]}>Buyer remark - {remark.rating}/5</Text>
                    </View>
                  </View>
                  <Text style={[styles.remarkBody, { color: palette.text }]}>{remark.body}</Text>
                </View>
              ) : (
                <Text style={[styles.contextLine, { color: palette.muted }]}>
                  Buyer remarks appear here after completion.
                </Text>
              )}
            </View>
          </>
        ) : (
          <View style={styles.loadingShell}>
            <Text style={[styles.contextLine, { color: palette.muted }]}>Order not found.</Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={isReviewOpen} animationType="fade" transparent onRequestClose={() => setIsReviewOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.28)' }]} onPress={() => setIsReviewOpen(false)} />
          <View style={[styles.reviewPanel, { backgroundColor: palette.surfaceRaised, borderColor: palette.border }]}>
            <Text style={[styles.reviewTitle, { color: palette.text }]}>Complete order</Text>
            <Text style={[styles.reviewCopy, { color: palette.muted }]}>Leave a public seller remark that future buyers can see.</Text>
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
              <Pressable onPress={() => setIsReviewOpen(false)} style={[styles.reviewSecondary, { backgroundColor: palette.surface }]}>
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
    </SafeAreaView>
  );
}

function PartyRow({
  label,
  person,
  palette,
}: {
  label: string;
  person: Order['buyer'];
  palette: (typeof Colors)['light'] | (typeof Colors)['dark'];
}) {
  const personId = person._id ?? person.id;

  return (
    <Pressable
      onPress={() => {
        if (personId) {
          router.push({ pathname: '/profile/[id]', params: { id: personId } });
        }
      }}
      style={[styles.partyRow, { backgroundColor: palette.surface }]}>
      <SocialAvatar name={person.name} imageUrl={person.avatarUrl} size={42} />
      <View style={styles.partyCopy}>
        <Text style={[styles.partyName, { color: palette.text }]}>{person.name}</Text>
        <Text style={[styles.partyMeta, { color: palette.muted }]}>
          {label} - {person.role} - {person.location}
        </Text>
      </View>
      <Feather name="chevron-right" size={18} color={palette.muted} />
    </Pressable>
  );
}

function InfoRow({
  label,
  value,
  palette,
}: {
  label: string;
  value: string;
  palette: (typeof Colors)['light'] | (typeof Colors)['dark'];
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: palette.muted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: palette.text }]}>{value}</Text>
    </View>
  );
}

function OrderAction({
  label,
  icon,
  palette,
  onPress,
  disabled,
  tone = 'default',
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  palette: (typeof Colors)['light'] | (typeof Colors)['dark'];
  onPress: () => void;
  disabled?: boolean;
  tone?: 'default' | 'danger';
}) {
  const color = tone === 'danger' ? palette.accent : palette.tint;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.orderAction, { backgroundColor: `${color}16`, opacity: disabled ? 0.65 : 1 }]}>
      <Feather name={icon} size={16} color={color} />
      <Text style={[styles.orderActionText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 34 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: { width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  iconButtonSpacer: { width: 40 },
  topTitle: { fontFamily: Fonts.rounded, fontSize: 18, fontWeight: '800' },
  loadingShell: { minHeight: 220, alignItems: 'center', justifyContent: 'center' },
  heroCard: { borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, padding: 18, gap: 14 },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  heroTitleWrap: { flex: 1, gap: 4 },
  eyebrow: { fontFamily: Fonts.rounded, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2 },
  heroTitle: { fontFamily: Fonts.rounded, fontSize: 25, fontWeight: '800', lineHeight: 31 },
  totalCard: { borderRadius: 18, padding: 14, gap: 4 },
  totalLabel: { fontFamily: Fonts.sans, fontSize: 12 },
  totalValue: { fontFamily: Fonts.rounded, fontSize: 22, fontWeight: '800' },
  sectionCard: { borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 12 },
  sectionTitle: { fontFamily: Fonts.rounded, fontSize: 18, fontWeight: '800' },
  timeline: { gap: 12 },
  timelineRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  timelineDot: { width: 15, height: 15, borderRadius: 999, borderWidth: 2, marginTop: 2 },
  timelineTextWrap: { flex: 1, gap: 3 },
  timelineTitle: { fontFamily: Fonts.rounded, fontSize: 14, fontWeight: '800', textTransform: 'capitalize' },
  timelineBody: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19 },
  cancelledRow: { borderRadius: 16, padding: 12, flexDirection: 'row', gap: 9, alignItems: 'center' },
  cancelledText: { fontFamily: Fonts.rounded, fontSize: 13, fontWeight: '800' },
  partyRow: { borderRadius: 18, padding: 12, flexDirection: 'row', gap: 11, alignItems: 'center' },
  partyCopy: { flex: 1, gap: 3 },
  partyName: { fontFamily: Fonts.rounded, fontSize: 14, fontWeight: '800' },
  partyMeta: { fontFamily: Fonts.sans, fontSize: 12, textTransform: 'capitalize' },
  contextLine: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19 },
  infoRow: { gap: 4 },
  infoLabel: { fontFamily: Fonts.sans, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  infoValue: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20 },
  actionGrid: { gap: 10 },
  orderAction: { borderRadius: 16, paddingHorizontal: 13, paddingVertical: 12, flexDirection: 'row', gap: 9, alignItems: 'center' },
  orderActionText: { fontFamily: Fonts.rounded, fontSize: 13, fontWeight: '800' },
  remarkCard: { borderRadius: 18, padding: 14, gap: 10 },
  remarkTop: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  remarkCopy: { flex: 1, gap: 2 },
  remarkName: { fontFamily: Fonts.rounded, fontSize: 14, fontWeight: '800' },
  remarkMeta: { fontFamily: Fonts.sans, fontSize: 12 },
  remarkBody: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20 },
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
