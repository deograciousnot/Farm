import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

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
  const { token, isLoading: isSessionLoading } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [scope, setScope] = useState<'buyer' | 'seller'>('buyer');

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

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: palette.background }]}
      contentContainerStyle={styles.content}>
      <View style={[styles.heroCard, { backgroundColor: palette.surfaceRaised, borderColor: palette.border }]}>
        <View style={[styles.heroGlow, { backgroundColor: `${palette.tint}18` }]} />
        <Text style={[styles.heading, { color: palette.text }]}>Orders</Text>
        <Text style={[styles.subheading, { color: palette.muted }]}>
          Cleaner status tracking, but still human. You should always see who the order is with.
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

      {orders.map((order) => {
        const counterparty = scope === 'buyer' ? order.seller : order.buyer;

        return (
          <View
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
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 18, gap: 14, paddingBottom: 36 },
  heroCard: { borderRadius: 28, borderWidth: 1, padding: 20, gap: 10, overflow: 'hidden' },
  heroGlow: {
    position: 'absolute',
    width: 132,
    height: 132,
    borderRadius: 999,
    right: -22,
    top: -24,
  },
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
});
