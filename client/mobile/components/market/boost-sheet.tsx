import Feather from '@expo/vector-icons/Feather';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { TextField } from '@/components/ui/text-field';
import { Radius, Spacing } from '@/constants/theme';
import { queryKeys, usePaymentPlans } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import { api, getErrorMessage } from '@/lib/api';
import type { Payment, Product } from '@/lib/types';
import { useSession } from '@/providers/session-provider';
import { formatCurrency } from '@/utils/format';

const POLL_EVERY_MS = 3_000;
// The server gives up on an unanswered prompt after 3 minutes; stop asking a little after that.
const STOP_POLLING_AFTER_MS = 200_000;

type Step = { kind: 'choose' } | { kind: 'waiting'; payment: Payment } | { kind: 'done'; payment: Payment };

/** Lets a seller pay with M-Pesa to put their listing at the top of the market for a while. */
export function BoostSheet({ product, visible, onClose }: { product: Product; visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const { token, user } = useSession();
  const queryClient = useQueryClient();
  const plans = usePaymentPlans(visible);
  const [planId, setPlanId] = useState('boost-7d');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [step, setStep] = useState<Step>({ kind: 'choose' });
  const [error, setError] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    pollTimer.current = null;
  };

  useEffect(() => stopPolling, []);

  function close() {
    // Closing while waiting is fine: the boost still applies if they pay, and they get a notification.
    stopPolling();
    setStep({ kind: 'choose' });
    setError('');
    onClose();
  }

  function pollPayment(payment: Payment) {
    const startedAt = Date.now();
    stopPolling();
    pollTimer.current = setInterval(async () => {
      if (!token) return;

      if (Date.now() - startedAt > STOP_POLLING_AFTER_MS) {
        stopPolling();
        setStep({ kind: 'done', payment: { ...payment, status: 'failed', message: "We didn't hear back from M-Pesa. If you paid, your boost will start shortly." } });
        return;
      }

      try {
        const { item } = await api.getPayment(token, payment._id);
        if (item.status !== 'pending') {
          stopPolling();
          setStep({ kind: 'done', payment: item });
          if (item.status === 'paid') {
            void queryClient.invalidateQueries({ queryKey: queryKeys.product(product._id) });
            void queryClient.invalidateQueries({ queryKey: queryKeys.marketplace });
          }
        }
      } catch {
        // A dropped connection shouldn't end the wait; try again on the next tick.
      }
    }, POLL_EVERY_MS);
  }

  async function pay() {
    if (!token) return;
    setError('');
    setIsStarting(true);

    try {
      const { item } = await api.boostListing(token, { productId: product._id, plan: planId, phone: phone.trim() });
      setStep({ kind: 'waiting', payment: item });
      pollPayment(item);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsStarting(false);
    }
  }

  const options = plans.data?.listingBoosts ?? [];
  const selected = options.find((option) => option.id === planId);

  return (
    <Sheet visible={visible} onClose={close} title="Boost this listing" subtitle="Show it first in the market and on buyers' Home feed.">
      {step.kind === 'choose' ? (
        <View style={styles.stack}>
          {plans.isPending ? (
            <ActivityIndicator color={colors.primary} />
          ) : plans.isError || !plans.data?.available ? (
            <AppText variant="callout" color="textMuted">
              Boosts aren&apos;t available right now. Please try again later.
            </AppText>
          ) : (
            <>
              <View accessibilityRole="radiogroup" style={styles.stack}>
                {options.map((option) => {
                  const isSelected = option.id === planId;
                  return (
                    <Pressable
                      key={option.id}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: isSelected }}
                      onPress={() => setPlanId(option.id)}
                      style={[
                        styles.option,
                        { borderColor: isSelected ? colors.primary : colors.border, backgroundColor: isSelected ? colors.primarySoft : colors.surface },
                      ]}>
                      <Feather name={isSelected ? 'check-circle' : 'circle'} size={20} color={isSelected ? colors.primary : colors.textSubtle} />
                      <View style={styles.optionCopy}>
                        <AppText variant="bodyStrong">{option.label}</AppText>
                        <AppText variant="caption" color="textMuted">
                          About {formatCurrency(Math.ceil(option.amount / option.days))} a day
                        </AppText>
                      </View>
                      <AppText variant="bodyStrong">{formatCurrency(option.amount)}</AppText>
                    </Pressable>
                  );
                })}
              </View>

              <TextField
                label="M-Pesa number"
                value={phone}
                onChangeText={setPhone}
                placeholder="0712 345 678"
                keyboardType="phone-pad"
                icon="smartphone"
                hint="You'll get a prompt on this phone to enter your M-Pesa PIN."
                error={error || undefined}
              />

              {plans.data.simulated ? (
                <AppText variant="caption" color="textSubtle">
                  Test mode: no real money is charged. The payment confirms itself after a few seconds.
                </AppText>
              ) : null}

              <Button
                label={selected ? `Pay ${formatCurrency(selected.amount)} with M-Pesa` : 'Choose a plan'}
                icon="zap"
                onPress={() => void pay()}
                loading={isStarting}
                disabled={!selected || !phone.trim()}
                fullWidth
              />
              <AppText variant="caption" color="textSubtle" style={styles.centered}>
                Boosted listings are labelled &quot;Featured&quot; so buyers know they&apos;re promoted.
              </AppText>
            </>
          )}
        </View>
      ) : step.kind === 'waiting' ? (
        <View style={[styles.stack, styles.status]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <AppText variant="headline" style={styles.centered}>
            Check your phone
          </AppText>
          <AppText variant="callout" color="textMuted" style={styles.centered}>
            Enter your M-Pesa PIN to pay {formatCurrency(step.payment.amount)}. This screen updates by itself once you do.
          </AppText>
          <Button label="Close" variant="ghost" onPress={close} />
        </View>
      ) : step.payment.status === 'paid' ? (
        <View style={[styles.stack, styles.status]}>
          <View style={[styles.statusIcon, { backgroundColor: colors.successSoft }]}>
            <Feather name="check" size={28} color={colors.success} />
          </View>
          <AppText variant="headline" style={styles.centered}>
            Your listing is boosted
          </AppText>
          <AppText variant="callout" color="textMuted" style={styles.centered}>
            Buyers will see it first.{step.payment.receipt ? ` M-Pesa receipt ${step.payment.receipt}.` : ''}
          </AppText>
          <Button label="Done" onPress={close} fullWidth />
        </View>
      ) : (
        <View style={[styles.stack, styles.status]}>
          <View style={[styles.statusIcon, { backgroundColor: colors.dangerSoft }]}>
            <Feather name="x" size={28} color={colors.danger} />
          </View>
          <AppText variant="headline" style={styles.centered}>
            {step.payment.status === 'cancelled' ? 'Payment cancelled' : "Payment didn't go through"}
          </AppText>
          <AppText variant="callout" color="textMuted" style={styles.centered}>
            {step.payment.message || 'Nothing was charged. You can try again.'}
          </AppText>
          <Button label="Try again" onPress={() => setStep({ kind: 'choose' })} fullWidth />
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  stack: { gap: Spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
  },
  optionCopy: { flex: 1, gap: 2 },
  status: { alignItems: 'center', paddingVertical: Spacing.md },
  statusIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  centered: { textAlign: 'center' },
});
