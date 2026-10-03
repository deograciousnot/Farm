import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Spacing } from '@/constants/theme';

type SectionProps = {
  title: string;
  /** Small text link on the right of the title. */
  action?: { label: string; onPress: () => void; disabled?: boolean };
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Section({ title, action, children, style }: SectionProps) {
  return (
    <View style={[styles.section, style]}>
      <View style={styles.header}>
        <AppText variant="headline" style={styles.title}>
          {title}
        </AppText>
        {action ? (
          <Pressable accessibilityRole="button" onPress={action.onPress} disabled={action.disabled} hitSlop={10}>
            <AppText variant="label" color={action.disabled ? 'textSubtle' : 'primary'}>
              {action.label}
            </AppText>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  title: { flex: 1 },
});
