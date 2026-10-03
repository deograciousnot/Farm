import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Radius, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type MessageComposerProps = {
  placeholder: string;
  /** When set, shows a sign-in prompt with this label instead of the input. */
  guestLabel?: string;
  onGuestPress?: () => void;
  /** Resolve true to clear the draft. */
  onSend: (body: string) => Promise<boolean>;
};

/** Auto-growing text box with a send button, for comments and answers. */
export function MessageComposer({ placeholder, guestLabel, onGuestPress, onSend }: MessageComposerProps) {
  const { colors } = useTheme();
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const canSend = Boolean(draft.trim()) && !isSending;

  if (guestLabel) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onGuestPress}
        style={[styles.composer, styles.guest, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <AppText variant="callout" color="textSubtle">
          {guestLabel}
        </AppText>
      </Pressable>
    );
  }

  async function send() {
    setIsSending(true);

    try {
      if (await onSend(draft.trim())) {
        setDraft('');
      }
    } finally {
      setIsSending(false);
    }
  }

  return (
    <View style={[styles.composer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        placeholder={placeholder}
        placeholderTextColor={colors.textSubtle}
        multiline
        style={[styles.input, { color: colors.text }]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Send"
        onPress={() => void send()}
        disabled={!canSend}
        style={[styles.send, { backgroundColor: canSend ? colors.primary : colors.surfaceMuted }]}>
        {isSending ? (
          <ActivityIndicator size="small" color={colors.onPrimary} />
        ) : (
          <Feather name="arrow-up" size={18} color={canSend ? colors.onPrimary : colors.textSubtle} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.xs,
    borderWidth: 1,
    borderRadius: Radius.xl,
    paddingLeft: Spacing.sm,
    padding: 6,
  },
  guest: { minHeight: 52, alignItems: 'center' },
  input: { ...Type.callout, flex: 1, maxHeight: 120, paddingVertical: 8 },
  send: { width: 38, height: 38, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
});
