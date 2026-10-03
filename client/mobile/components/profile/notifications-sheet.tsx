import Feather from '@expo/vector-icons/Feather';
import { useQueryClient } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Sheet } from '@/components/ui/sheet';
import { EmptyState } from '@/components/ui/state-views';
import { type ColorToken, Radius, Spacing } from '@/constants/theme';
import { queryKeys } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import { api, getErrorMessage } from '@/lib/api';
import type { NotificationItem, ProfileResponse } from '@/lib/types';
import { useSession } from '@/providers/session-provider';
import { useToast } from '@/providers/toast-provider';
import { formatRelativeTime } from '@/utils/format';

const typeStyles: Record<NotificationItem['type'], { icon: keyof typeof Feather.glyphMap; color: ColorToken }> = {
  like: { icon: 'heart', color: 'like' },
  comment: { icon: 'message-circle', color: 'primary' },
  reply: { icon: 'corner-down-right', color: 'primary' },
  order: { icon: 'shopping-bag', color: 'accent' },
  community: { icon: 'users', color: 'primary' },
  system: { icon: 'bell', color: 'textMuted' },
  broadcast: { icon: 'shield', color: 'primary' },
};

type NotificationsSheetProps = {
  visible: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  unreadCount: number;
};

export function NotificationsSheet({ visible, onClose, notifications, unreadCount }: NotificationsSheetProps) {
  const { colors } = useTheme();
  const { token } = useSession();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  function updateCache(update: (data: ProfileResponse) => ProfileResponse) {
    queryClient.setQueryData<ProfileResponse>(queryKeys.myProfile, (data) => (data ? update(data) : data));
  }

  async function markRead(notification: NotificationItem) {
    if (!token || notification.isRead) {
      return;
    }

    // Optimistic: notifications are low-stakes, so don't make people wait.
    updateCache((data) => ({
      ...data,
      notificationMeta: { unreadCount: Math.max(0, data.notificationMeta.unreadCount - 1) },
      notifications: data.notifications.map((item) => (item._id === notification._id ? { ...item, isRead: true } : item)),
    }));

    try {
      await api.markNotificationRead(token, notification._id);
    } catch (error) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.myProfile });
      showToast(getErrorMessage(error), 'error');
    }
  }

  async function markAllRead() {
    if (!token) {
      return;
    }

    setIsMarkingAll(true);

    try {
      const response = await api.markAllNotificationsRead(token);
      updateCache((data) => ({ ...data, notificationMeta: { unreadCount: response.unreadCount }, notifications: response.items }));
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
    } finally {
      setIsMarkingAll(false);
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Notifications" subtitle={unreadCount ? `${unreadCount} unread` : 'All caught up'} tall>
      <View style={styles.links}>
        <Pressable
          accessibilityRole="link"
          onPress={() => {
            onClose();
            router.push('/broadcasts');
          }}
          style={styles.officialLink}>
          <Feather name="shield" size={14} color={colors.primary} />
          <AppText variant="label" color="primary">
            Official updates
          </AppText>
        </Pressable>
        {unreadCount ? (
          <Pressable accessibilityRole="button" onPress={() => void markAllRead()} disabled={isMarkingAll}>
            <AppText variant="label" color={isMarkingAll ? 'textSubtle' : 'primary'}>
              Mark all as read
            </AppText>
          </Pressable>
        ) : null}
      </View>
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {notifications.length ? (
          notifications.map((item) => {
            const style = typeStyles[item.type] ?? typeStyles.system;

            return (
              <Pressable
                key={item._id}
                accessibilityRole="button"
                accessibilityHint={item.link ? 'Opens the update' : item.isRead ? undefined : 'Marks as read'}
                onPress={() => {
                  void markRead(item);
                  if (item.link) {
                    onClose();
                    router.push(item.link as Href);
                  }
                }}
                style={[styles.item, !item.isRead && { backgroundColor: colors.primarySoft }]}>
                <View style={[styles.icon, { backgroundColor: colors.surface }]}>
                  <Feather name={style.icon} size={16} color={colors[style.color]} />
                </View>
                <View style={styles.copy}>
                  <AppText variant="label">{item.title}</AppText>
                  <AppText variant="callout" color="textMuted">
                    {item.body}
                  </AppText>
                  <AppText variant="caption" color="textSubtle">
                    {formatRelativeTime(item.createdAt)}
                  </AppText>
                </View>
                {!item.isRead ? <View style={[styles.dot, { backgroundColor: colors.primary }]} /> : null}
              </Pressable>
            );
          })
        ) : (
          <EmptyState icon="bell" title="No notifications yet" body="Likes, answers, comments, and order updates will show up here." />
        )}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  links: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  officialLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  list: { flex: 1 },
  item: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.sm, borderRadius: Radius.md, marginBottom: Spacing.xxs },
  icon: { width: 34, height: 34, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 2 },
  dot: { width: 8, height: 8, borderRadius: Radius.pill, marginTop: 6 },
});
