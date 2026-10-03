import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { IconButton } from '@/components/ui/icon-button';
import { Radius, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type QuantityStepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
};

export function QuantityStepper({ value, onChange, min = 1, max = Number.POSITIVE_INFINITY }: QuantityStepperProps) {
  const { colors } = useTheme();
  // Hold free-typed text until editing ends, so the field can be cleared and retyped.
  const [draft, setDraft] = useState<string | null>(null);
  const clamp = (next: number) => Math.min(max, Math.max(min, next));

  function commitDraft() {
    if (draft !== null) {
      onChange(clamp(Number.parseInt(draft, 10) || min));
      setDraft(null);
    }
  }

  return (
    <View style={[styles.stepper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <IconButton icon="minus" label="Decrease quantity" variant="plain" onPress={() => { setDraft(null); onChange(clamp(value - 1)); }} disabled={value <= min} />
      <TextInput
        accessibilityLabel="Quantity"
        value={draft ?? String(value)}
        onChangeText={(text) => {
          const digits = text.replace(/\D/g, '');
          setDraft(digits);
          // Commit valid numbers immediately; a tap on another button may not blur this field first.
          if (Number.parseInt(digits, 10)) {
            onChange(clamp(Number.parseInt(digits, 10)));
          }
        }}
        onBlur={commitDraft}
        onSubmitEditing={commitDraft}
        keyboardType="number-pad"
        selectTextOnFocus
        style={[styles.input, { color: colors.text }]}
      />
      <IconButton icon="plus" label="Increase quantity" variant="plain" onPress={() => { setDraft(null); onChange(clamp(value + 1)); }} disabled={value >= max} />
    </View>
  );
}

const styles = StyleSheet.create({
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.xxs,
    alignSelf: 'flex-start',
  },
  input: { ...Type.subhead, minWidth: 56, textAlign: 'center', paddingVertical: Spacing.xs },
});
