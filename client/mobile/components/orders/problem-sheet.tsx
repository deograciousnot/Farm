import Feather from '@expo/vector-icons/Feather';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { TextField } from '@/components/ui/text-field';
import { Radius, Spacing } from '@/constants/theme';
import { queryKeys } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import { api, getErrorMessage } from '@/lib/api';
import { useSession } from '@/providers/session-provider';
import { useToast } from '@/providers/toast-provider';

// Keep in step with ORDER_PROBLEMS in server/services/order-problems.js.
const problems = [
  { value: 'not-delivered', label: 'I paid but the goods never came' },
  { value: 'wrong-goods', label: 'Goods were wrong, short, or poor quality' },
  { value: 'unresponsive', label: 'The seller stopped responding' },
  { value: 'asked-to-pay-elsewhere', label: 'The seller asked me to pay in a suspicious way' },
  { value: 'other', label: 'Something else' },
] as const;

/** Lets a buyer tell FarmConnect an order went wrong, so the seller can be reviewed and stopped if needed. */
export function ProblemSheet({ orderId, visible, onClose }: { orderId: string; visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const { token } = useSession();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [problem, setProblem] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [isSending, setIsSending] = useState(false);

  async function send() {
    if (!token || !problem) return;
    setIsSending(true);

    try {
      const response = await api.reportOrderProblem(token, orderId, { problem, note: note.trim() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.order(orderId) });
      showToast(response.message);
      onClose();
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Problem with this order" subtitle="FarmConnect reviews every report. Sellers who take money and don't deliver are removed.">
      <View style={styles.stack}>
        <View accessibilityRole="radiogroup" style={styles.stack}>
          {problems.map((option) => {
            const isSelected = option.value === problem;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                onPress={() => setProblem(option.value)}
                style={[styles.option, { borderColor: isSelected ? colors.primary : colors.border, backgroundColor: isSelected ? colors.primarySoft : colors.surface }]}>
                <Feather name={isSelected ? 'check-circle' : 'circle'} size={18} color={isSelected ? colors.primary : colors.textSubtle} />
                <AppText variant="callout" style={styles.flex}>
                  {option.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        <TextField
          label="What happened? (optional)"
          value={note}
          onChangeText={setNote}
          placeholder="e.g. Paid KES 2,000 by M-Pesa on 12 Oct, transaction code…"
          multiline
          maxLength={500}
        />
        <AppText variant="caption" color="textSubtle">
          FarmConnect doesn&apos;t hold payments for goods, so we can&apos;t refund you. If you were defrauded, also report it to Safaricom (call 100 to reverse an M-Pesa payment) and to the police.
        </AppText>
        <Button label="Send report" icon="flag" onPress={() => void send()} loading={isSending} disabled={!problem} fullWidth />
      </View>
    </Sheet>
  );
}

/** The few rules that stop most marketplace scams, shown where buyers decide to pay. */
export function BuyerSafetyCard() {
  const { colors } = useTheme();
  const tips = [
    'Pay on delivery for first orders, or once you have seen the goods.',
    'Check the seller is Verified and read their reviews.',
    'FarmConnect never asks you to send money to us for goods.',
    'Never share your M-Pesa PIN or a code sent to your phone.',
  ];

  return (
    <View style={[styles.safety, { backgroundColor: colors.accentSoft }]}>
      <View style={styles.safetyTitle}>
        <Feather name="shield" size={16} color={colors.accent} />
        <AppText variant="label">Stay safe when paying</AppText>
      </View>
      {tips.map((tip) => (
        <View key={tip} style={styles.tip}>
          <AppText variant="callout" color="textMuted">
            •
          </AppText>
          <AppText variant="callout" color="textMuted" style={styles.flex}>
            {tip}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: Spacing.sm },
  flex: { flex: 1 },
  option: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.sm, borderRadius: Radius.md, borderWidth: 1.5 },
  safety: { borderRadius: Radius.lg, padding: Spacing.md, gap: 6 },
  safetyTitle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: 2 },
  tip: { flexDirection: 'row', gap: Spacing.xs },
});
