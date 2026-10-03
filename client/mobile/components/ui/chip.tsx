import Feather from '@expo/vector-icons/Feather';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Radius, ScreenPadding, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Feather.glyphMap;
  trailingIcon?: keyof typeof Feather.glyphMap;
};

export function Chip({ label, selected = false, onPress, icon, trailingIcon }: ChipProps) {
  const { colors } = useTheme();
  const foreground = selected ? colors.onPrimary : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected
          ? { backgroundColor: colors.primary, borderColor: colors.primary }
          : { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && styles.pressed,
      ]}>
      {icon ? <Feather name={icon} size={14} color={selected ? foreground : colors.primary} /> : null}
      <AppText variant="label" style={[styles.label, { color: foreground }]} numberOfLines={1}>
        {label}
      </AppText>
      {trailingIcon ? <Feather name={trailingIcon} size={14} color={selected ? foreground : colors.textMuted} /> : null}
    </Pressable>
  );
}

type ChipGroupProps = {
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  /** Wrap onto multiple lines instead of scrolling sideways. */
  wrap?: boolean;
  /** Bleed the scroll area to the screen edges inside padded screens. */
  bleed?: boolean;
};

export function ChipGroup({ options, value, onChange, wrap = false, bleed = false }: ChipGroupProps) {
  const chips = options.map((option) => (
    <Chip key={option} label={option} selected={option === value} onPress={() => onChange(option)} />
  ));

  if (wrap) {
    return <View style={styles.wrap}>{chips}</View>;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={bleed ? styles.bleed : null}
      contentContainerStyle={[styles.row, bleed && styles.bleedContent]}>
      {chips}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 36,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: { fontSize: 13 },
  pressed: { opacity: 0.75 },
  row: { gap: Spacing.xs },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  bleed: { marginHorizontal: -ScreenPadding },
  bleedContent: { paddingHorizontal: ScreenPadding },
});
