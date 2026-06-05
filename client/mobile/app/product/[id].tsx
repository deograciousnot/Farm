import Feather from '@expo/vector-icons/Feather';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { SocialAvatar } from '@/components/social-avatar';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { api } from '@/lib/api';
import type { Product } from '@/lib/types';
import { useSession } from '@/providers/session-provider';
import { formatCurrency } from '@/utils/format';

export default function ProductDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { token, user } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [note, setNote] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState(user?.location ?? 'Nairobi');
  const [deliveryContact, setDeliveryContact] = useState(user?.phone ?? '');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  useEffect(() => {
    if (!id) {
      return;
    }

    let isMounted = true;

    async function loadProduct() {
      try {
        const response = await api.getProductById(id);

        if (!isMounted) {
          return;
        }

        setProduct(response.item);
      } catch (error) {
        console.warn('Failed to load product.', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadProduct();

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    setDeliveryLocation(user?.location ?? 'Nairobi');
    setDeliveryContact(user?.phone ?? '');
  }, [user?.location, user?.phone]);

  const quantityValue = Math.max(1, Number.parseInt(quantity, 10) || 1);
  const estimatedTotal = product ? product.price * quantityValue : 0;
  const productSellerId = product?.seller.id || product?.seller._id;
  const currentUserId = user?.id || user?._id;
  const isOwnListing = Boolean(productSellerId && currentUserId && productSellerId === currentUserId);
  const sellerPhone = product?.seller.phone?.trim();
  const sellerIsVerified = product?.seller.verificationStatus === 'verified' || product?.seller.verificationStatus === 'top-rated';

  async function handleStartOrder() {
    if (!product) {
      return;
    }

    if (!token) {
      Alert.alert('Sign in required', 'Please sign in to request an order.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Go to login', onPress: () => router.replace('/auth?mode=login') },
      ]);
      return;
    }

    if (isOwnListing) {
      Alert.alert('Own listing', 'You cannot place an order on your own listing.');
      return;
    }

    setIsSubmittingOrder(true);

    try {
      await api.createOrder(token, {
        productId: product._id,
        quantity: quantityValue,
        note: note.trim(),
        deliveryLocation: deliveryLocation.trim(),
        deliveryContact: deliveryContact.trim(),
      });

      setProduct((current) =>
        current
          ? {
              ...current,
              stock: Math.max(0, current.stock - quantityValue),
            }
          : current
      );

      Alert.alert(
        'Order request sent',
        'FarmConnect has opened an order record. Confirm payment directly with the verified seller contact and track fulfilment in Orders.',
        [
          {
            text: 'View orders',
            onPress: () => router.replace('/(tabs)/orders'),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Order failed', error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setIsSubmittingOrder(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: product?.name ?? 'Produce details' }} />
      <ScrollView
        style={[styles.screen, { backgroundColor: palette.background }]}
        contentContainerStyle={styles.content}>
        <View style={[styles.hero, { backgroundColor: palette.surfaceRaised, borderColor: palette.border }]}>
          <View style={[styles.heroGlowLarge, { backgroundColor: `${palette.tint}18` }]} />
          <View style={[styles.heroGlowSmall, { backgroundColor: `${palette.accentSecondary}20` }]} />

          {isLoading || !product ? (
            <View style={styles.loadingShell}>
              <ActivityIndicator color={palette.tint} />
            </View>
          ) : (
            <>
              <Text style={[styles.category, { color: palette.tint }]}>{product.category}</Text>
              <Text style={[styles.name, { color: palette.text }]}>{product.name}</Text>
              <Text style={[styles.price, { color: palette.text }]}>
                {formatCurrency(product.price)} / {product.unit}
              </Text>
              <Pressable
                onPress={() => {
                  const sellerId = product.seller._id ?? product.seller.id;

                  if (sellerId) {
                    router.push({ pathname: '/profile/[id]', params: { id: sellerId } });
                  }
                }}
                style={styles.sellerRow}>
                <SocialAvatar name={product.seller.name} imageUrl={product.seller.avatarUrl} size={38} />
                <View>
                  <Text style={[styles.sellerName, { color: palette.text }]}>{product.seller.name}</Text>
                  <Text style={[styles.meta, { color: palette.muted }]}>
                    {product.location} - {product.seller.verificationStatus}
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={palette.muted} />
              </Pressable>
              <Text style={[styles.stockMeta, { color: palette.muted }]}>
                {product.stock} {product.unit} available · Trust score {product.seller.trustScore?.toFixed(1) ?? '0.0'}
              </Text>
              <Text style={[styles.description, { color: palette.muted }]}>{product.description}</Text>
            </>
          )}
        </View>

        {product ? (
          <View style={[styles.v1PolicyCard, { backgroundColor: `${palette.tint}12`, borderColor: `${palette.tint}45` }]}>
            <View style={styles.policyHeader}>
              <Feather name="shield" size={17} color={palette.tint} />
              <Text style={[styles.policyTitle, { color: palette.text }]}>Order policy</Text>
            </View>
            <Text style={[styles.policyCopy, { color: palette.muted }]}>
              FarmConnect does not process payments in app. The app records the request, seller identity, contact point,
              delivery details, and order status so buyer and seller can coordinate safely.
            </Text>
            <View style={[styles.contactStrip, { backgroundColor: palette.surface }]}>
              <View style={styles.contactCopy}>
                <Text style={[styles.contactLabel, { color: palette.muted }]}>Verified seller phone</Text>
                <Text style={[styles.contactValue, { color: palette.text }]}>
                  {sellerIsVerified && sellerPhone ? sellerPhone : 'Shown after seller verification'}
                </Text>
              </View>
              {sellerIsVerified && sellerPhone ? (
                <Pressable
                  onPress={() => void Linking.openURL(`tel:${sellerPhone.replace(/\s/g, '')}`)}
                  style={[styles.callButton, { backgroundColor: palette.tint }]}>
                  <Feather name="phone" size={15} color="#ffffff" />
                  <Text style={styles.callButtonText}>Call</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={[styles.detailsCard, { backgroundColor: palette.surfaceRaised, borderColor: palette.border }]}>
          <Text style={[styles.cardTitle, { color: palette.text }]}>Request order</Text>
          <Text style={[styles.cardBody, { color: palette.muted }]}>
            Confirm quantity, delivery details, and a short note. Payment is coordinated directly with the verified seller.
          </Text>

          <View style={styles.quantityRow}>
            <Text style={[styles.inputLabel, { color: palette.text }]}>Quantity</Text>
            <View style={[styles.quantityControls, { backgroundColor: palette.surface }]}>
              <Pressable onPress={() => setQuantity(String(Math.max(1, quantityValue - 1)))} style={styles.quantityButton}>
                <Feather name="minus" size={16} color={palette.text} />
              </Pressable>
              <TextInput
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="number-pad"
                style={[styles.quantityInput, { color: palette.text }]}
              />
              <Pressable
                onPress={() =>
                  setQuantity(String(Math.min(product?.stock ?? quantityValue + 1, quantityValue + 1)))
                }
                style={styles.quantityButton}>
                <Feather name="plus" size={16} color={palette.text} />
              </Pressable>
            </View>
          </View>

          <TextInput
            value={deliveryLocation}
            onChangeText={setDeliveryLocation}
            placeholder="Delivery location"
            placeholderTextColor={palette.muted}
            style={[styles.input, { color: palette.text, backgroundColor: palette.surface }]}
          />
          <TextInput
            value={deliveryContact}
            onChangeText={setDeliveryContact}
            placeholder="Phone or delivery contact"
            placeholderTextColor={palette.muted}
            style={[styles.input, { color: palette.text, backgroundColor: palette.surface }]}
          />
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Optional note for packaging, timing, or dispatch"
            placeholderTextColor={palette.muted}
            multiline
            style={[styles.noteInput, { color: palette.text, backgroundColor: palette.surface }]}
          />

          <View style={[styles.summaryCard, { backgroundColor: palette.surface }]}>
            <Text style={[styles.summaryLabel, { color: palette.muted }]}>Estimated order value</Text>
            <Text style={[styles.summaryValue, { color: palette.text }]}>{formatCurrency(estimatedTotal)}</Text>
            <Text style={[styles.summaryHelp, { color: palette.muted }]}>Not charged in app</Text>
          </View>

          <Pressable
            onPress={handleStartOrder}
            disabled={isSubmittingOrder || !product?.stock || isOwnListing}
            style={[
              styles.button,
              {
                backgroundColor: !product?.stock || isOwnListing ? palette.surface : palette.tint,
              },
            ]}>
            <Text
              style={[
                styles.buttonText,
                { color: !product?.stock || isOwnListing ? palette.muted : '#ffffff' },
              ]}>
              {isOwnListing ? 'Your listing' : isSubmittingOrder ? 'Sending request...' : product?.stock ? 'Request order' : 'Out of stock'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 18, gap: 16, paddingBottom: 36 },
  hero: { borderRadius: 28, borderWidth: 1, padding: 22, gap: 10, overflow: 'hidden' },
  heroGlowLarge: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 999,
    right: -32,
    top: -38,
  },
  heroGlowSmall: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 999,
    left: -18,
    bottom: -18,
  },
  loadingShell: { minHeight: 140, alignItems: 'center', justifyContent: 'center' },
  category: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  name: { fontFamily: Fonts.rounded, fontSize: 30, fontWeight: '700' },
  price: { fontFamily: Fonts.rounded, fontSize: 20, fontWeight: '700' },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  sellerName: { fontFamily: Fonts.rounded, fontSize: 15, fontWeight: '700' },
  meta: { fontFamily: Fonts.sans, fontSize: 13 },
  stockMeta: { fontFamily: Fonts.sans, fontSize: 13, marginTop: 4 },
  description: { fontFamily: Fonts.sans, fontSize: 15, lineHeight: 22 },
  v1PolicyCard: { borderRadius: 24, borderWidth: 1, padding: 16, gap: 12 },
  policyHeader: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  policyTitle: { fontFamily: Fonts.rounded, fontSize: 16, fontWeight: '800' },
  policyCopy: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19 },
  contactStrip: { borderRadius: 18, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  contactCopy: { flex: 1, gap: 3 },
  contactLabel: { fontFamily: Fonts.sans, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  contactValue: { fontFamily: Fonts.rounded, fontSize: 15, fontWeight: '800' },
  callButton: { borderRadius: 999, paddingHorizontal: 13, paddingVertical: 10, flexDirection: 'row', gap: 7, alignItems: 'center' },
  callButtonText: { color: '#ffffff', fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '800' },
  detailsCard: { borderRadius: 24, borderWidth: 1, padding: 18, gap: 12 },
  cardTitle: { fontFamily: Fonts.rounded, fontSize: 18, fontWeight: '700' },
  cardBody: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 21 },
  quantityRow: { gap: 8 },
  inputLabel: { fontFamily: Fonts.rounded, fontSize: 13, fontWeight: '700' },
  quantityControls: {
    borderRadius: 18,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityButton: { width: 38, height: 38, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  quantityInput: { minWidth: 60, textAlign: 'center', fontFamily: Fonts.rounded, fontSize: 18, fontWeight: '700' },
  input: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontFamily: Fonts.sans,
    fontSize: 14,
  },
  noteInput: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 92,
    textAlignVertical: 'top',
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  summaryCard: { borderRadius: 18, padding: 14, gap: 4 },
  summaryLabel: { fontFamily: Fonts.sans, fontSize: 12 },
  summaryValue: { fontFamily: Fonts.rounded, fontSize: 20, fontWeight: '700' },
  summaryHelp: { fontFamily: Fonts.sans, fontSize: 12 },
  button: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonText: { fontFamily: Fonts.rounded, fontSize: 14, fontWeight: '700' },
});
