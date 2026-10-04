import { forwardRef } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type CodeInputProps = {
  value: string;
  onChange: (digits: string) => void;
  /** Called once all 6 digits are in, so the code submits without pressing a button. */
  onComplete?: (digits: string) => void;
  invalid?: boolean;
  autoFocus?: boolean;
};

/** A single large field for a 6-digit SMS or email code. Fills itself from the SMS on supported phones. */
export const CodeInput = forwardRef<TextInput, CodeInputProps>(function CodeInput(
  { value, onChange, onComplete, invalid, autoFocus },
  ref,
) {
  const { colors } = useTheme();

  return (
    <TextInput
      ref={ref}
      value={value}
      onChangeText={(text) => {
        const digits = text.replace(/\D/g, '').slice(0, 6);
        onChange(digits);
        if (digits.length === 6) onComplete?.(digits);
      }}
      autoFocus={autoFocus}
      keyboardType="number-pad"
      autoComplete="sms-otp"
      textContentType="oneTimeCode"
      maxLength={6}
      placeholder="••••••"
      placeholderTextColor={colors.textSubtle}
      accessibilityLabel="6-digit code"
      style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: invalid ? colors.danger : colors.border }]}
    />
  );
});

const styles = StyleSheet.create({
  input: {
    minHeight: 64,
    borderWidth: 1,
    borderRadius: Radius.md,
    textAlign: 'center',
    fontFamily: FontFamily.bold,
    fontSize: 28,
    letterSpacing: 12,
  },
});
