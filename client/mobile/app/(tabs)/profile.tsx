import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NotificationsSheet } from '@/components/profile/notifications-sheet';
import { ProfileView } from '@/components/profile/profile-view';
import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { IconButton } from '@/components/ui/icon-button';
import { ListRow } from '@/components/ui/list-row';
import { ListSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/state-views';
import { Radius, ScreenPadding, Spacing } from '@/constants/theme';
import { useMyProfile, usePullToRefresh, useRefreshOnFocus } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/providers/session-provider';

export default function ProfileScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { token } = useSession();
  const profile = useMyProfile();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  useRefreshOnFocus(profile.refetch);
  const { refreshing, onRefresh } = usePullToRefresh(profile.refetch);
  const unreadCount = profile.data?.notificationMeta.unreadCount ?? 0;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.xs }]}
        refreshControl={
          token ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} /> : undefined
        }
        showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <IconButton icon="settings" label="Settings" onPress={() => router.push('/settings')} />
        </View>

        {!token ? (
          <>
            <EmptyState
              icon="user"
              title="Make yourself known"
              body="Sign in to share what you grow, ask questions, follow farmers, and build a trusted name."
              action={{ label: 'Sign in or create account', onPress: () => router.push('/auth?mode=login') }}
            />
            <Card padded={false} style={styles.notificationsCard}>
              <ListRow icon="shield" title="Official updates" subtitle="Advisories and alerts from verified organisations" onPress={() => router.push('/broadcasts')} />
            </Card>
          </>
        ) : profile.isPending ? (
          <ListSkeleton count={2} />
        ) : profile.isError ? (
          <ErrorState error={profile.error} onRetry={() => void profile.refetch()} retrying={profile.isFetching} />
        ) : (
          <ProfileView data={profile.data}>
            <Card padded={false} style={styles.notificationsCard}>
              <ListRow
                icon="bell"
                title="Notifications"
                subtitle={unreadCount ? 'Tap to catch up' : 'All caught up'}
                onPress={() => setIsNotificationsOpen(true)}
                trailing={
                  <View style={styles.trailing}>
                    {unreadCount ? (
                      <View style={[styles.unread, { backgroundColor: colors.primary }]}>
                        <AppText variant="caption" color="onPrimary">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </AppText>
                      </View>
                    ) : null}
                    <Feather name="chevron-right" size={18} color={colors.textSubtle} />
                  </View>
                }
              />
              <ListRow icon="shield" title="Official updates" subtitle="Advisories and alerts for your area" onPress={() => router.push('/broadcasts')} />
            </Card>
          </ProfileView>
        )}
      </ScrollView>

      {profile.data ? (
        <NotificationsSheet
          visible={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
          notifications={profile.data.notifications}
          unreadCount={unreadCount}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: ScreenPadding, paddingBottom: Spacing.xxl, gap: Spacing.sm },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end' },
  notificationsCard: { paddingHorizontal: Spacing.sm },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  unread: { minWidth: 22, height: 22, borderRadius: Radius.pill, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
});
