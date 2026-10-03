import Feather from '@expo/vector-icons/Feather';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { type ColorToken, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'md' | 'sm';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: keyof typeof Feather.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

const variantColors: Record<ButtonVariant, { background: ColorToken | null; foreground: ColorToken }> = {
  primary: { background: 'primary', foreground: 'onPrimary' },
  secondary: { background: 'surfaceMuted', foreground: 'text' },
  ghost: { background: null, foreground: 'primary' },
  danger: { background: 'dangerSoft', foreground: 'danger' },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}: ButtonProps) {
  const { colors } = useTheme();
  const { background, foreground } = variantColors[variant];
  const isInactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isInactive, busy: loading }}
      onPress={onPress}
      disabled={isInactive}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' ? styles.small : styles.medium,
        fullWidth && styles.fullWidth,
        { backgroundColor: background ? colors[background] : 'transparent' },
        disabled && !loading && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator size="small" color={colors[foreground]} />
      ) : (
        <View style={styles.content}>
          {icon ? <Feather name={icon} size={size === 'sm' ? 15 : 17} color={colors[foreground]} /> : null}
          <AppText variant="label" color={foreground} numberOfLines={1}>
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medium: { minHeight: 48, paddingHorizontal: Spacing.lg },
  small: { minHeight: 36, paddingHorizontal: Spacing.sm },
  fullWidth: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
});
