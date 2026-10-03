import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export function MoreButton({ onPress, label = 'More options' }: { onPress: () => void; label?: string }) {
  const { colors } = useTheme();

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={10} style={styles.more}>
      <Feather name="more-horizontal" size={18} color={colors.textSubtle} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  more: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
});
