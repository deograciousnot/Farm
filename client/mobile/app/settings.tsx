import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { shareProfile } from '@/components/profile/profile-view';
import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ListRow } from '@/components/ui/list-row';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Section } from '@/components/ui/section';
import { Sheet } from '@/components/ui/sheet';
import { TextField } from '@/components/ui/text-field';
import { ScreenPadding, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, getErrorMessage } from '@/lib/api';
import { usePreferences } from '@/providers/preferences-provider';
import { useSession } from '@/providers/session-provider';
import { useToast } from '@/providers/toast-provider';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { user, token, logout, logoutToGuest } = useSession();
  const { dataSaver, setPreference } = usePreferences();
  const [sheet, setSheet] = useState<'password' | 'delete' | null>(null);
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const isSignedIn = Boolean(token && user);

  async function contactSupport() {
    const subject = encodeURIComponent('FarmConnect support request');
    const body = encodeURIComponent(`Account: ${user?.email ?? 'Guest'}\nApp version: ${appVersion}\n\nWhat happened:\n`);
    const url = `mailto:support@farmconnect.app?subject=${subject}&body=${body}`;

    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Contact support', 'Email support@farmconnect.app with what happened and your account email.');
    }
  }

  function confirmSignOut() {
    Alert.alert('Sign out?', 'You can keep browsing as a guest or sign out completely.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Browse as guest', onPress: () => void logoutToGuest() },
      { text: 'Sign out', style: 'destructive', onPress: () => void logout() },
    ]);
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Settings" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isSignedIn && user ? (
          <Card style={styles.account}>
            <Avatar name={user.name} imageUrl={user.avatarUrl} size={52} />
            <View style={styles.flex}>
              <AppText variant="subhead" numberOfLines={1}>
                {user.name}
              </AppText>
              <AppText variant="caption" color="textMuted" numberOfLines={1}>
                {user.email}
              </AppText>
            </View>
          </Card>
        ) : (
          <Card tone="primarySoft">
            <AppText variant="subhead">You&apos;re browsing as a guest</AppText>
            <AppText variant="callout" color="textMuted">
              Sign in to post, ask questions, follow farmers, and place orders.
            </AppText>
            <Button label="Sign in" onPress={() => router.push('/auth?mode=login')} style={styles.alignStart} />
          </Card>
        )}

        {isSignedIn && user ? (
          <Section title="Account">
            <Card padded={false} style={styles.group}>
              <ListRow icon="edit-2" title="Edit profile" subtitle="Name, photo, bio, phone" onPress={() => router.push('/profile/edit')} />
              <ListRow
                icon="share-2"
                title="Share your profile"
                subtitle="Send it to buyers or other farmers"
                onPress={() => shareProfile(user)}
              />
              <ListRow icon="lock" title="Change password" onPress={() => setSheet('password')} />
            </Card>
          </Section>
        ) : null}

        <Section title="App">
          <Card padded={false} style={styles.group}>
            <ListRow
              icon="wifi-off"
              title="Data saver"
              subtitle="Load feed photos only when you tap them, and don't autoplay video"
              trailing={
                <Switch
                  value={dataSaver}
                  onValueChange={(value) => setPreference('dataSaver', value)}
                  trackColor={{ true: colors.primary, false: colors.border }}
                  thumbColor={colors.surface}
                  accessibilityLabel="Data saver"
                />
              }
            />
          </Card>
        </Section>

        <Section title="Help">
          <Card padded={false} style={styles.group}>
            <ListRow icon="mail" title="Contact support" subtitle="We usually reply within a day" onPress={() => void contactSupport()} />
            {isSignedIn ? <ListRow icon="log-out" title="Sign out" onPress={confirmSignOut} /> : null}
          </Card>
        </Section>

        {isSignedIn ? (
          <Section title="Danger zone">
            <Card padded={false} style={styles.group}>
              <ListRow
                icon="trash-2"
                tone="danger"
                title="Delete account"
                subtitle="Permanently erase your profile and content"
                onPress={() => setSheet('delete')}
              />
            </Card>
          </Section>
        ) : null}

        <AppText variant="caption" color="textSubtle" align="center" selectable>
          FarmConnect {appVersion}
        </AppText>
      </ScrollView>

      <ChangePasswordSheet visible={sheet === 'password'} onClose={() => setSheet(null)} />
      <DeleteAccountSheet visible={sheet === 'delete'} onClose={() => setSheet(null)} />
    </View>
  );
}

function ChangePasswordSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { token } = useSession();
  const { showToast } = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  function close() {
    setCurrent('');
    setNext('');
    setConfirm('');
    setError('');
    onClose();
  }

  async function save() {
    if (!token) {
      return;
    }

    if (next.length < 6) {
      setError('Use at least 6 characters.');
      return;
    }

    if (next !== confirm) {
      setError("New passwords don't match.");
      return;
    }

    setIsSaving(true);

    try {
      await api.changePassword(token, { currentPassword: current, newPassword: next });
      showToast('Password updated');
      close();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Sheet visible={visible} onClose={close} title="Change password">
      <TextField label="Current password" value={current} onChangeText={setCurrent} secureTextEntry autoComplete="current-password" />
      <TextField label="New password" value={next} onChangeText={setNext} secureTextEntry autoComplete="new-password" hint="At least 6 characters" />
      <TextField label="Confirm new password" value={confirm} onChangeText={setConfirm} secureTextEntry autoComplete="new-password" error={error} />
      <Button label="Update password" onPress={() => void save()} loading={isSaving} disabled={!current || !next} fullWidth />
    </Sheet>
  );
}

function DeleteAccountSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { token, clearDeletedAccount } = useSession();
  const { showToast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const canDelete = Boolean(password) && confirmation === 'DELETE';

  async function remove() {
    if (!token || !canDelete) {
      return;
    }

    setIsDeleting(true);

    try {
      await api.deleteAccount(token, { currentPassword: password, confirmation });
      onClose();
      showToast('Your account has been deleted', 'info');
      await clearDeletedAccount();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
      setIsDeleting(false);
    }
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Delete account"
      subtitle="This erases your profile, posts, listings, comments, answers, followers, and notifications. Order records keep only what's needed for the other party, with your personal details removed.">
      <TextField label="Current password" value={password} onChangeText={setPassword} secureTextEntry />
      <TextField
        label="Type DELETE to confirm"
        value={confirmation}
        onChangeText={setConfirmation}
        autoCapitalize="characters"
        error={error}
      />
      <Button label="Delete my account" variant="danger" onPress={() => void remove()} loading={isDeleting} disabled={!canDelete} fullWidth />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: ScreenPadding, paddingTop: Spacing.xs, paddingBottom: Spacing.xxl, gap: Spacing.xl },
  flex: { flex: 1 },
  account: { flexDirection: 'row', alignItems: 'center' },
  alignStart: { alignSelf: 'flex-start' },
  group: { paddingHorizontal: Spacing.sm, gap: 0 },
});
