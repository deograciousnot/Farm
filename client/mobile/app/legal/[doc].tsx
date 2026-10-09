import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { ScreenHeader } from '@/components/ui/screen-header';
import { LEGAL_UPDATED, PRIVACY, TERMS } from '@/constants/legal';
import { ScreenPadding, Spacing } from '@/constants/theme';

export default function LegalScreen() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const content = doc === 'privacy' ? PRIVACY : TERMS;

  return (
    <View style={styles.screen}>
      <ScreenHeader title={content.title} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppText variant="caption" color="textMuted">
          Last updated {LEGAL_UPDATED}
        </AppText>
        <AppText variant="body">{content.intro}</AppText>
        {content.sections.map((section) => (
          <View key={section.heading} style={styles.section}>
            <AppText variant="subhead">{section.heading}</AppText>
            <AppText variant="body" color="textMuted">
              {section.body}
            </AppText>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: ScreenPadding, paddingTop: Spacing.xs, paddingBottom: Spacing.xxl, gap: Spacing.md },
  section: { gap: Spacing.xxs },
});
