import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { type ColorToken, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type IconButtonProps = {
  icon: keyof typeof Feather.glyphMap;
  /** Read aloud by screen readers; icon-only buttons have no visible label. */
  label: string;
  onPress?: () => void;
  variant?: 'plain' | 'filled';
  color?: ColorToken;
  size?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function IconButton({
  icon,
  label,
  onPress,
  variant = 'filled',
  color = 'text',
  size = 40,
  disabled,
  style,
}: IconButtonProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        { width: size, height: size, backgroundColor: variant === 'filled' ? colors.surface : 'transparent' },
        variant === 'filled' && { borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth },
        (pressed || disabled) && styles.dimmed,
        style,
      ]}>
      <Feather name={icon} size={Math.round(size * 0.45)} color={colors[color]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  dimmed: { opacity: 0.6 },
});
