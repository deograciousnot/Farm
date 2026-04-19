import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { api } from '@/lib/api';
import { useSession } from '@/providers/session-provider';

const categories = ['Pricing', 'Crop care', 'Trade trust', 'Market Prices', 'Farm Inputs'];

export default function NewThreadScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { token } = useSession();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!token) {
      Alert.alert('Sign in required', 'Please sign in before starting a thread.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.createThread(token, { title, body, category });
      router.replace({ pathname: '/community/[id]', params: { id: response.item._id } });
    } catch (error) {
      Alert.alert('Could not publish thread', error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: palette.surfaceRaised }]}>
            <Feather name="x" size={18} color={palette.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: palette.text }]}>New thread</Text>
          <Pressable onPress={handleSubmit} style={[styles.publishButton, { backgroundColor: palette.tint }]}>
            <Text style={styles.publishButtonText}>{isSubmitting ? 'Posting...' : 'Post'}</Text>
          </Pressable>
        </View>

        <View style={[styles.card, { backgroundColor: palette.surfaceRaised }]}>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Thread title"
            placeholderTextColor={palette.muted}
            style={[styles.titleInput, { color: palette.text, backgroundColor: palette.surface }]}
          />
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Ask your question or share the full context..."
            placeholderTextColor={palette.muted}
            multiline
            style={[styles.bodyInput, { color: palette.text, backgroundColor: palette.surface }]}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {categories.map((item) => (
              <Pressable
                key={item}
                onPress={() => setCategory(item)}
                style={[styles.chip, { backgroundColor: category === item ? `${palette.tint}12` : palette.surface }]}>
                <Text style={[styles.chipText, { color: category === item ? palette.tint : palette.text }]}>{item}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 28 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  backButton: { width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: Fonts.rounded, fontSize: 20, fontWeight: '700' },
  publishButton: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  publishButtonText: { color: '#ffffff', fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '700' },
  card: { borderRadius: 24, padding: 14, gap: 12 },
  titleInput: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 13, fontFamily: Fonts.rounded, fontSize: 16, fontWeight: '700' },
  bodyInput: { borderRadius: 18, minHeight: 140, paddingHorizontal: 14, paddingVertical: 14, textAlignVertical: 'top', fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20 },
  chips: { gap: 8 },
  chip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9 },
  chipText: { fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '700' },
});
