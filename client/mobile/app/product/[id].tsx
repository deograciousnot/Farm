import Feather from '@expo/vector-icons/Feather';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ListRow } from '@/components/ui/list-row';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Section } from '@/components/ui/section';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/state-views';
import { TextField } from '@/components/ui/text-field';
import { Radius, ScreenPadding, Spacing } from '@/constants/theme';
import { queryKeys, useProduct } from '@/hooks/queries';
import { useRequireSignIn } from '@/hooks/use-content-actions';
import { useTheme } from '@/hooks/use-theme';
import { api, getErrorMessage } from '@/lib/api';
import type { Product } from '@/lib/types';
import { useSession } from '@/providers/session-provider';
import { useToast } from '@/providers/toast-provider';
import { formatCurrency } from '@/utils/format';
import { describeUser, getUserId, openProfile } from '@/utils/user';

export default function ProductDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const product = useProduct(id);

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title="Listing" />
      {product.isPending ? (
        <View style={styles.content}>
          <Skeleton height={260} radius={Radius.lg} />
          <Skeleton width="70%" height={24} />
          <Skeleton width="40%" height={18} />
        </View>
      ) : product.isError ? (
        <ErrorState error={product.error} onRetry={() => void product.refetch()} retrying={product.isFetching} />
      ) : !product.data ? (
        <EmptyState icon="shopping-bag" title="Listing not found" body="It may have been removed by the seller." />
      ) : (
        <ProductBody product={product.data} />
      )}
    </KeyboardAvoidingView>
  );
}

function ProductBody({ product }: { product: Product }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { user } = useSession();
  const requireSignIn = useRequireSignIn();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [deliveryLocation, setDeliveryLocation] = useState(user?.location ?? '');
  const [deliveryContact, setDeliveryContact] = useState(user?.phone ?? '');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOwnListing = Boolean(user && getUserId(product.seller) === getUserId(user));
  const isOutOfStock = product.stock <= 0;
  const sellerPhone = product.seller.phone?.trim();
  const sellerIsVerified = product.seller.verificationStatus === 'verified' || product.seller.verificationStatus === 'top-rated';
  const images = product.mediaUrls ?? [];
  const galleryWidth = width - ScreenPadding * 2;

  async function requestOrder() {
    const token = requireSignIn('Sign in to request an order from this seller.');

    if (!token) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.createOrder(token, {
        productId: product._id,
        quantity,
        note: note.trim(),
        deliveryLocation: deliveryLocation.trim(),
        deliveryContact: deliveryContact.trim(),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.product(product._id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.ordersRoot });
      showToast('Order request sent to the seller');
      router.replace({ pathname: '/order/[id]', params: { id: response.item._id } });
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={[styles.gallery, { backgroundColor: colors.surfaceMuted }]}>
        {images.length ? (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {images.map((uri) => (
              <Image key={uri} source={{ uri }} contentFit="cover" transition={150} style={{ width: galleryWidth, height: '100%' }} />
            ))}
          </ScrollView>
        ) : (
          <Feather name="image" size={32} color={colors.textSubtle} />
        )}
      </View>

      <View style={styles.summary}>
        <View style={styles.badges}>
          <Badge label={product.category} tone="primary" />
          {isOutOfStock ? <Badge label="Sold out" tone="danger" /> : <Badge label={`${product.stock} ${product.unit} available`} />}
        </View>
        <AppText variant="title">{product.name}</AppText>
        <AppText variant="headline">
          {formatCurrency(product.price)}
          <AppText variant="callout" color="textMuted">
            {' '}
            per {product.unit}
          </AppText>
        </AppText>
        <View style={styles.location}>
          <Feather name="map-pin" size={14} color={colors.textMuted} />
          <AppText variant="callout" color="textMuted">
            {product.location}
          </AppText>
        </View>
      </View>

      <Card padded={false} style={styles.sellerCard}>
        <ListRow
          avatar={{ name: product.seller.name, imageUrl: product.seller.avatarUrl }}
          title={product.seller.name}
          subtitle={describeUser(
            product.seller,
            sellerIsVerified ? 'Verified' : undefined,
            `Trust ${product.seller.trustScore?.toFixed(1) ?? '0.0'}`
          )}
          onPress={() => openProfile(product.seller)}
        />
      </Card>

      {product.description ? (
        <Section title="About this listing">
          <AppText variant="body" color="textMuted">
            {product.description}
          </AppText>
        </Section>
      ) : null}

      <Card tone="surfaceMuted">
        <View style={styles.policyTitle}>
          <Feather name="shield" size={16} color={colors.primary} />
          <AppText variant="label">How ordering works</AppText>
        </View>
        <AppText variant="callout" color="textMuted">
          FarmConnect records your request and tracks it until delivery. You pay the seller directly — nothing is charged in the app.
        </AppText>
        {sellerIsVerified && sellerPhone ? (
          <Button
            label={`Call ${product.seller.name.split(' ')[0]}`}
            icon="phone"
            variant="secondary"
            size="sm"
            onPress={() => void Linking.openURL(`tel:${sellerPhone.replace(/\s/g, '')}`)}
            style={styles.callButton}
          />
        ) : (
          <AppText variant="caption" color="textSubtle">
            The seller&apos;s phone number appears once they are verified.
          </AppText>
        )}
      </Card>

      {isOwnListing ? (
        <EmptyState icon="tag" title="This is your listing" body="Buyers' requests for it show up under Orders → Sales." />
      ) : isOutOfStock ? null : (
        <Section title="Request an order">
          <View style={styles.quantityRow}>
            <AppText variant="label">Quantity ({product.unit})</AppText>
            <QuantityStepper value={quantity} onChange={setQuantity} max={product.stock} />
          </View>
          <TextField label="Deliver to" value={deliveryLocation} onChangeText={setDeliveryLocation} placeholder="Town or drop-off point" icon="map-pin" />
          <TextField
            label="Your phone"
            value={deliveryContact}
            onChangeText={setDeliveryContact}
            placeholder="So the seller can reach you"
            keyboardType="phone-pad"
            icon="phone"
          />
          <TextField label="Note (optional)" value={note} onChangeText={setNote} placeholder="Packaging, timing, or delivery details" multiline />

          <View style={[styles.total, { borderColor: colors.border }]}>
            <AppText variant="callout" color="textMuted">
              Estimated total
            </AppText>
            <AppText variant="headline">{formatCurrency(product.price * quantity)}</AppText>
          </View>
          <Button label="Request order" onPress={() => void requestOrder()} loading={isSubmitting} fullWidth />
        </Section>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: ScreenPadding, paddingTop: Spacing.xs, paddingBottom: Spacing.xxl, gap: Spacing.lg },
  gallery: { height: 260, borderRadius: Radius.lg, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  summary: { gap: Spacing.xs },
  badges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  location: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sellerCard: { paddingHorizontal: Spacing.sm },
  policyTitle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  callButton: { alignSelf: 'flex-start' },
  quantityRow: { gap: Spacing.xs },
  total: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
