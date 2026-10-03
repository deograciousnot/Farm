import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/ui/avatar';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ListRowProps = {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Feather.glyphMap;
  /** Show a person's avatar instead of an icon. */
  avatar?: { name: string; imageUrl?: string };
  tone?: 'default' | 'danger';
  onPress?: () => void;
  /** Replaces the chevron, e.g. a switch or a value. */
  trailing?: React.ReactNode;
};

export function ListRow({ title, subtitle, icon, avatar, tone = 'default', onPress, trailing }: ListRowProps) {
  const { colors } = useTheme();
  const isDanger = tone === 'danger';

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {avatar ? (
        <Avatar name={avatar.name} imageUrl={avatar.imageUrl} size={40} />
      ) : icon ? (
        <View style={[styles.icon, { backgroundColor: isDanger ? colors.dangerSoft : colors.primarySoft }]}>
          <Feather name={icon} size={17} color={isDanger ? colors.danger : colors.primary} />
        </View>
      ) : null}
      <View style={styles.copy}>
        <AppText variant="bodyStrong" color={isDanger ? 'danger' : 'text'} numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color="textMuted" numberOfLines={2}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailing ?? (onPress ? <Feather name="chevron-right" size={18} color={colors.textSubtle} /> : null)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
  },
  pressed: { opacity: 0.65 },
  icon: { width: 36, height: 36, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 2 },
});
