import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { IconButton } from '@/components/ui/icon-button';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Let the sheet grow to most of the screen (for lists and conversations). */
  tall?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
};

export function Sheet({ visible, onClose, title, subtitle, children, tall = false, contentStyle }: SheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
        <Pressable accessibilityLabel="Close" style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]} onPress={onClose} />
        <Animated.View
          entering={SlideInDown.duration(240)}
          style={[
            styles.panel,
            tall && styles.tall,
            { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, Spacing.md) },
          ]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          {title ? (
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <AppText variant="headline">{title}</AppText>
                {subtitle ? (
                  <AppText variant="callout" color="textMuted">
                    {subtitle}
                  </AppText>
                ) : null}
              </View>
              <IconButton icon="x" label="Close" onPress={onClose} size={36} />
            </View>
          ) : null}
          <View style={[styles.content, tall && styles.tallContent, contentStyle]}>{children}</View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  panel: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    gap: Spacing.md,
    maxHeight: '88%',
  },
  tall: { height: '82%' },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: Radius.pill },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  headerCopy: { flex: 1, gap: 2 },
  content: { gap: Spacing.sm },
  tallContent: { flex: 1 },
});
