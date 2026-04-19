import { StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type StatusTone = 'success' | 'warning';

type StatusPillProps = {
  label: string;
  tone?: StatusTone;
};

export function StatusPill({ label, tone = 'success' }: StatusPillProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const backgroundColor = tone === 'warning' ? `${palette.warning}20` : `${palette.success}22`;
  const textColor = tone === 'warning' ? palette.warning : palette.success;

  return (
    <View style={[styles.pill, { backgroundColor }]}>
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  label: {
    fontFamily: Fonts.rounded,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
});
