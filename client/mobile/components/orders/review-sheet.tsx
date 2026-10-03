import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { queryKeys } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import { api, getErrorMessage } from '@/lib/api';
import type { Order } from '@/lib/types';
import { useSession } from '@/providers/session-provider';
import { useToast } from '@/providers/toast-provider';

const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

type ReviewSheetProps = {
  order: Order | null;
  onClose: () => void;
};

/** Buyer marks an order delivered and leaves a public remark on the seller. */
export function ReviewSheet({ order, onClose }: ReviewSheetProps) {
  const { colors } = useTheme();
  const { token } = useSession();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [rating, setRating] = useState(5);
  const [remark, setRemark] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (order) {
      setRating(5);
      setRemark('');
      setError('');
    }
  }, [order]);

  async function submit() {
    if (!token || !order) {
      return;
    }

    if (!remark.trim()) {
      setError('Add a short note so other buyers know what to expect.');
      return;
    }

    setIsSaving(true);

    try {
      await api.completeOrderWithRemark(token, order._id, { rating, body: remark.trim() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.ordersRoot });
      void queryClient.invalidateQueries({ queryKey: queryKeys.order(order._id) });
      showToast('Order completed. Thanks for the review!');
      onClose();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Sheet
      visible={Boolean(order)}
      onClose={onClose}
      title="Confirm delivery"
      subtitle={order ? `Rate ${order.seller.name}. Your review is public on their profile.` : undefined}>
      <View style={styles.stars} accessibilityRole="adjustable" accessibilityLabel={`Rating ${rating} of 5`}>
        {[1, 2, 3, 4, 5].map((value) => (
          <Pressable key={value} accessibilityLabel={`${value} star${value > 1 ? 's' : ''}`} onPress={() => setRating(value)} hitSlop={6}>
            <Ionicons name={value <= rating ? 'star' : 'star-outline'} size={32} color={value <= rating ? colors.accent : colors.textSubtle} />
          </Pressable>
        ))}
        <AppText variant="label" color="textMuted" style={styles.ratingLabel}>
          {ratingLabels[rating]}
        </AppText>
      </View>
      <TextField
        value={remark}
        onChangeText={(text) => {
          setRemark(text);
          setError('');
        }}
        placeholder="How were the quality, timing, and communication?"
        multiline
        error={error}
      />
      <Button label="Complete order" onPress={() => void submit()} loading={isSaving} fullWidth />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  stars: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  ratingLabel: { marginLeft: Spacing.xs },
});
