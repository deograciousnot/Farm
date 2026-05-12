import Feather from '@expo/vector-icons/Feather';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SocialAvatar } from '@/components/social-avatar';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { api } from '@/lib/api';
import type { CommunityThread, ThreadReply } from '@/lib/types';
import { useSession } from '@/providers/session-provider';

export default function CommunityThreadScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const params = useLocalSearchParams<{ id?: string }>();
  const { token } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isReplyLoading, setIsReplyLoading] = useState(true);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [thread, setThread] = useState<CommunityThread | null>(null);
  const [replies, setReplies] = useState<ThreadReply[]>([]);
  const [replyDraft, setReplyDraft] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadThread() {
      if (!params.id) {
        setIsLoading(false);
        setIsReplyLoading(false);
        return;
      }

      try {
        const [threadResponse, repliesResponse] = await Promise.all([
          api.getThreadById(params.id),
          api.getThreadReplies(params.id),
        ]);

        if (!isMounted) {
          return;
        }

        setThread(threadResponse.item);
        setReplies(repliesResponse.items);
      } catch (error) {
        console.warn('Failed to load thread.', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsReplyLoading(false);
        }
      }
    }

    void loadThread();

    return () => {
      isMounted = false;
    };
  }, [params.id]);

  async function handleReplySubmit() {
    if (!token || !params.id || !replyDraft.trim()) {
      if (!token) {
        Alert.alert('Sign in required', 'Please sign in to join this discussion.');
      }

      return;
    }

    setIsSubmittingReply(true);

    try {
      const response = await api.createThreadReply(token, params.id, replyDraft.trim());
      setReplies((current) => [response.item, ...current]);
      setThread((current) => (current ? { ...current, repliesCount: response.repliesCount } : current));
      setReplyDraft('');
    } catch (error) {
      Alert.alert('Reply failed', error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setIsSubmittingReply(false);
    }
  }

  function formatRelativeDate(value?: string) {
    if (!value) {
      return 'Now';
    }

    const date = new Date(value);
    const diffInHours = Math.max(0, (Date.now() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return 'Just now';
    }

    if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    }

    return `${Math.floor(diffInHours / 24)}d ago`;
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: palette.surfaceRaised }]}>
            <Feather name="arrow-left" size={18} color={palette.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: palette.text }]}>Thread</Text>
          <View style={styles.headerSpacer} />
        </View>

        {isLoading ? (
          <View style={styles.loadingShell}>
            <ActivityIndicator color={palette.tint} />
          </View>
        ) : thread ? (
          <View style={[styles.threadCard, { backgroundColor: palette.surfaceRaised }]}>
            <View style={styles.metaRow}>
              <View style={[styles.categoryPill, { backgroundColor: `${palette.tint}12` }]}>
                <Text style={[styles.categoryText, { color: palette.tint }]}>{thread.category}</Text>
              </View>
              <Text style={[styles.metaText, { color: palette.muted }]}>{thread.viewsCount} views</Text>
            </View>

            <Text style={[styles.title, { color: palette.text }]}>{thread.title}</Text>
            <Text style={[styles.body, { color: palette.muted }]}>{thread.body}</Text>

            <Pressable
              onPress={() => {
                const authorId = thread.author._id ?? thread.author.id;

                if (authorId) {
                  router.push({ pathname: '/profile/[id]', params: { id: authorId } });
                }
              }}
              style={[styles.authorCard, { backgroundColor: palette.surface }]}>
              <SocialAvatar name={thread.author.name} imageUrl={thread.author.avatarUrl} size={42} />
              <View style={styles.authorText}>
                <Text style={[styles.authorName, { color: palette.text }]}>{thread.author.name}</Text>
                <Text style={[styles.authorMeta, { color: palette.muted }]}>
                  {thread.author.role} - {thread.author.location}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={palette.muted} />
            </Pressable>

            <View style={styles.metricsRow}>
              <View style={styles.metric}>
                <Feather name="message-square" size={16} color={palette.text} />
                <Text style={[styles.metricText, { color: palette.text }]}>{thread.repliesCount} replies</Text>
              </View>
              <View style={styles.metric}>
                <Feather name="eye" size={16} color={palette.text} />
                <Text style={[styles.metricText, { color: palette.text }]}>{thread.viewsCount} views</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: palette.surfaceRaised }]}>
            <Text style={[styles.emptyTitle, { color: palette.text }]}>Thread not found</Text>
          </View>
        )}

        <View style={[styles.replyComposer, { backgroundColor: palette.surfaceRaised }]}>
          <View style={styles.replyComposerHeader}>
            <Text style={[styles.replyComposerTitle, { color: palette.text }]}>Join the discussion</Text>
            <Text style={[styles.replyComposerNote, { color: palette.muted }]}>
              {token ? 'Share something useful, short, and specific.' : 'Sign in to reply.'}
            </Text>
          </View>
          <TextInput
            value={replyDraft}
            onChangeText={setReplyDraft}
            editable={Boolean(token) && !isSubmittingReply}
            placeholder="Add your take, advice, or follow-up question..."
            placeholderTextColor={palette.muted}
            multiline
            style={[styles.replyInput, { color: palette.text, backgroundColor: palette.surface }]}
          />
          <View style={styles.replyComposerFooter}>
            <Text style={[styles.replyCountText, { color: palette.muted }]}>{replies.length} visible replies</Text>
            <Pressable
              onPress={handleReplySubmit}
              disabled={!token || isSubmittingReply || !replyDraft.trim()}
              style={[
                styles.replyButton,
                {
                  backgroundColor:
                    !token || isSubmittingReply || !replyDraft.trim() ? palette.surface : palette.tint,
                },
              ]}>
              <Text
                style={[
                  styles.replyButtonText,
                  { color: !token || isSubmittingReply || !replyDraft.trim() ? palette.muted : '#ffffff' },
                ]}>
                {isSubmittingReply ? 'Posting...' : 'Reply'}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.repliesSection}>
          <View style={styles.repliesHeader}>
            <Text style={[styles.repliesTitle, { color: palette.text }]}>Replies</Text>
            <Text style={[styles.repliesSubtitle, { color: palette.muted }]}>
              Practical answers read better than noise.
            </Text>
          </View>

          {isReplyLoading ? (
            <View style={styles.loadingShell}>
              <ActivityIndicator color={palette.tint} />
            </View>
          ) : replies.length ? (
            replies.map((reply) => (
              <View key={reply._id} style={[styles.replyCard, { backgroundColor: palette.surfaceRaised }]}>
                <View style={styles.replyTopRow}>
                  <Pressable
                    onPress={() => {
                      const authorId = reply.author._id ?? reply.author.id;

                      if (authorId) {
                        router.push({ pathname: '/profile/[id]', params: { id: authorId } });
                      }
                    }}
                    style={styles.replyAuthorRow}>
                    <SocialAvatar name={reply.author.name} imageUrl={reply.author.avatarUrl} size={38} />
                    <View style={styles.replyAuthorText}>
                      <Text style={[styles.replyAuthorName, { color: palette.text }]}>{reply.author.name}</Text>
                      <Text style={[styles.replyMeta, { color: palette.muted }]}>
                        {reply.author.role} · {reply.author.location} · {formatRelativeDate(reply.createdAt)}
                      </Text>
                    </View>
                  </Pressable>
                </View>
                <Text style={[styles.replyBody, { color: palette.text }]}>{reply.body}</Text>
              </View>
            ))
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: palette.surfaceRaised }]}>
              <Text style={[styles.emptyTitle, { color: palette.text }]}>No replies yet</Text>
              <Text style={[styles.emptyBody, { color: palette.muted }]}>
                Be the first person to answer and get this thread moving.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 28 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: Fonts.rounded, fontSize: 20, fontWeight: '700' },
  headerSpacer: { width: 40 },
  loadingShell: { paddingVertical: 40, alignItems: 'center' },
  threadCard: { borderRadius: 26, padding: 18, gap: 14 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryPill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  categoryText: { fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '700' },
  metaText: { fontFamily: Fonts.sans, fontSize: 12 },
  title: { fontFamily: Fonts.rounded, fontSize: 24, fontWeight: '700', lineHeight: 30 },
  body: { fontFamily: Fonts.sans, fontSize: 15, lineHeight: 23 },
  authorCard: { borderRadius: 18, padding: 12, flexDirection: 'row', gap: 12, alignItems: 'center' },
  authorText: { flex: 1 },
  authorName: { fontFamily: Fonts.rounded, fontSize: 14, fontWeight: '700' },
  authorMeta: { fontFamily: Fonts.sans, fontSize: 12, marginTop: 2 },
  metricsRow: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  metric: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metricText: { fontFamily: Fonts.sans, fontSize: 13, fontWeight: '700' },
  emptyCard: { borderRadius: 22, padding: 18 },
  emptyTitle: { fontFamily: Fonts.rounded, fontSize: 18, fontWeight: '700' },
  emptyBody: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 21, marginTop: 6 },
  replyComposer: { borderRadius: 24, padding: 16, gap: 12 },
  replyComposerHeader: { gap: 4 },
  replyComposerTitle: { fontFamily: Fonts.rounded, fontSize: 18, fontWeight: '700' },
  replyComposerNote: { fontFamily: Fonts.sans, fontSize: 13 },
  replyInput: {
    minHeight: 110,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    textAlignVertical: 'top',
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 21,
  },
  replyComposerFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  replyCountText: { fontFamily: Fonts.sans, fontSize: 12 },
  replyButton: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 11 },
  replyButtonText: { fontFamily: Fonts.rounded, fontSize: 13, fontWeight: '700' },
  repliesSection: { gap: 12 },
  repliesHeader: { gap: 4 },
  repliesTitle: { fontFamily: Fonts.rounded, fontSize: 20, fontWeight: '700' },
  repliesSubtitle: { fontFamily: Fonts.sans, fontSize: 13 },
  replyCard: { borderRadius: 22, padding: 16, gap: 12 },
  replyTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  replyAuthorRow: { flexDirection: 'row', gap: 10, alignItems: 'center', flex: 1 },
  replyAuthorText: { flex: 1 },
  replyAuthorName: { fontFamily: Fonts.rounded, fontSize: 14, fontWeight: '700' },
  replyMeta: { fontFamily: Fonts.sans, fontSize: 12, marginTop: 2 },
  replyBody: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 21 },
});
