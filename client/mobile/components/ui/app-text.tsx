import { Text, type TextProps } from 'react-native';

import { type ColorToken, Type, type TypeVariant } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type AppTextProps = TextProps & {
  variant?: TypeVariant;
  color?: ColorToken;
  align?: 'left' | 'center' | 'right';
};

export function AppText({ variant = 'body', color = 'text', align, style, ...rest }: AppTextProps) {
  const { colors } = useTheme();

  return <Text {...rest} style={[Type[variant], { color: colors[color] }, align ? { textAlign: align } : null, style]} />;
}
