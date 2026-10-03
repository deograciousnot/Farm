import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { MediaPicker } from '@/components/ui/media-picker';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { ChipGroup } from '@/components/ui/chip';
import { ScreenHeader } from '@/components/ui/screen-header';
import { EmptyState } from '@/components/ui/state-views';
import { TextField } from '@/components/ui/text-field';
import { ScreenPadding, Spacing } from '@/constants/theme';
import { COMMUNITY_TOPICS } from '@/constants/topics';
import { queryKeys } from '@/hooks/queries';
import { api, getErrorMessage } from '@/lib/api';
import type { UploadableAsset } from '@/lib/types';
import { useSession } from '@/providers/session-provider';
import { useToast } from '@/providers/toast-provider';

export default function NewThreadScreen() {
  const { token } = useSession();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [topic, setTopic] = useState<string>(COMMUNITY_TOPICS[0]);
  const [media, setMedia] = useState<UploadableAsset[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSubmit = title.trim().length > 0 && body.trim().length > 0 && !isSubmitting;

  async function submit() {
    if (!token || !canSubmit) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.createThread(token, { title: title.trim(), body: body.trim(), category: topic, media });
      void queryClient.invalidateQueries({ queryKey: queryKeys.community });
      showToast('Question posted');
      router.replace({ pathname: '/community/[id]', params: { id: response.item._id } });
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Ask the community" closeIcon />
        <EmptyState
          icon="lock"
          title="Sign in to ask"
          body="Questions are tied to your profile so others know who they're helping."
          action={{ label: 'Sign in', onPress: () => router.replace('/auth?mode=login') }}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader
        title="Ask the community"
        closeIcon
        right={<Button label="Post" size="sm" onPress={() => void submit()} disabled={!canSubmit} loading={isSubmitting} />}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextField
          label="Your question"
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Why are my tomato leaves curling?"
          maxLength={140}
        />
        <TextField
          label="Details"
          value={body}
          onChangeText={setBody}
          placeholder="What crop or animal, where you farm, what you've already tried…"
          hint="The more context you give, the better the answers."
          multiline
        />
        <View style={styles.group}>
          <AppText variant="label">Topic</AppText>
          <ChipGroup options={COMMUNITY_TOPICS} value={topic} onChange={setTopic} wrap />
        </View>
        <View style={styles.group}>
          <AppText variant="label">Photos</AppText>
          <AppText variant="caption" color="textMuted">
            Close-ups help a lot for pests, disease, soil, or animal health.
          </AppText>
          <MediaPicker value={media} onChange={setMedia} limit={4} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: ScreenPadding, paddingTop: Spacing.xs, paddingBottom: Spacing.xxl, gap: Spacing.lg },
  group: { gap: Spacing.xs },
});
