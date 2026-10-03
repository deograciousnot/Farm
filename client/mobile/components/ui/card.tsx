import { Pressable, StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { type ColorToken, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type CardProps = ViewProps & {
  onPress?: () => void;
  tone?: Extract<ColorToken, 'surface' | 'surfaceMuted' | 'primarySoft' | 'accentSoft' | 'dangerSoft'>;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Card({ onPress, tone = 'surface', padded = true, style, children, ...rest }: CardProps) {
  const { colors } = useTheme();
  const cardStyle = [
    styles.card,
    padded && styles.padded,
    { backgroundColor: colors[tone] },
    tone === 'surface' && { borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth },
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [cardStyle, pressed && styles.pressed]}
        {...rest}>
        {children}
      </Pressable>
    );
  }

  return (
    <View style={cardStyle} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, gap: Spacing.sm, overflow: 'hidden' },
  padded: { padding: Spacing.md },
  pressed: { opacity: 0.85 },
});
