import { StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type SectionCardProps = {
  title: string;
  subtitle: string;
  accent: string;
};

export function SectionCard({ title, subtitle, accent }: SectionCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <View style={[styles.card, { backgroundColor: palette.surfaceRaised, borderColor: palette.border }]}>
      <View style={[styles.glow, { backgroundColor: `${accent}18` }]} />
      <View style={styles.topRow}>
        <View style={[styles.dot, { backgroundColor: accent }]} />
        <View style={[styles.spark, { backgroundColor: `${accent}2b` }]} />
      </View>
      <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: palette.muted }]}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexBasis: '47%',
    minWidth: 150,
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    gap: 10,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 999,
    right: -18,
    top: -26,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 999,
  },
  spark: {
    width: 46,
    height: 12,
    borderRadius: 999,
  },
  title: {
    fontFamily: Fonts.rounded,
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 18,
  },
});
