import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { type ColorToken, FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type BadgeTone = 'neutral' | 'primary' | 'accent' | 'success' | 'warning' | 'danger';

const toneColors: Record<BadgeTone, { background: ColorToken; foreground: ColorToken }> = {
  neutral: { background: 'surfaceMuted', foreground: 'textMuted' },
  primary: { background: 'primarySoft', foreground: 'primary' },
  accent: { background: 'accentSoft', foreground: 'accent' },
  success: { background: 'successSoft', foreground: 'success' },
  warning: { background: 'warningSoft', foreground: 'warning' },
  danger: { background: 'dangerSoft', foreground: 'danger' },
};

type BadgeProps = {
  label: string;
  tone?: BadgeTone;
  icon?: keyof typeof Feather.glyphMap;
};

export function Badge({ label, tone = 'neutral', icon }: BadgeProps) {
  const { colors } = useTheme();
  const { background, foreground } = toneColors[tone];

  return (
    <View style={[styles.badge, { backgroundColor: colors[background] }]}>
      {icon ? <Feather name={icon} size={11} color={colors[foreground]} /> : null}
      <AppText variant="caption" color={foreground} style={styles.label} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

const orderStatusTones: Record<string, BadgeTone> = {
  pending: 'warning',
  accepted: 'primary',
  'in-transit': 'accent',
  delivered: 'success',
  cancelled: 'danger',
};

export function OrderStatusBadge({ status }: { status: string }) {
  const label = status.replace('-', ' ');
  return <Badge label={label.charAt(0).toUpperCase() + label.slice(1)} tone={orderStatusTones[status] ?? 'neutral'} />;
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  label: { fontFamily: FontFamily.semibold },
});
