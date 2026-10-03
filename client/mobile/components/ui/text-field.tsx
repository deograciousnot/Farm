import Feather from '@expo/vector-icons/Feather';
import { forwardRef } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Radius, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type TextFieldProps = TextInputProps & {
  label?: string;
  hint?: string;
  error?: string;
  icon?: keyof typeof Feather.glyphMap;
  /** Rendered inside the field on the right, e.g. a clear button. */
  trailing?: React.ReactNode;
};

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, hint, error, icon, trailing, multiline, style, ...rest },
  ref
) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrapper}>
      {label ? (
        <AppText variant="label" color="text">
          {label}
        </AppText>
      ) : null}
      <View
        style={[
          styles.field,
          multiline && styles.multilineField,
          { backgroundColor: colors.surface, borderColor: error ? colors.danger : colors.border },
        ]}>
        {icon ? <Feather name={icon} size={17} color={colors.textSubtle} style={multiline ? styles.multilineIcon : null} /> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textSubtle}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          {...rest}
          style={[styles.input, multiline && styles.multilineInput, { color: colors.text }, style]}
        />
        {trailing}
      </View>
      {error ? (
        <AppText variant="caption" color="danger">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" color="textMuted">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  field: {
    minHeight: 50,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  multilineField: { alignItems: 'flex-start', paddingVertical: Spacing.xs },
  multilineIcon: { marginTop: 10 },
  input: { ...Type.body, flex: 1, paddingVertical: 12 },
  multilineInput: { minHeight: 110, paddingVertical: 8 },
});
