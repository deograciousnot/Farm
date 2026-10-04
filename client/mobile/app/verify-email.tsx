import Feather from '@expo/vector-icons/Feather';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CodeInput } from '@/components/auth/code-input';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Radius, ScreenPadding, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, getErrorMessage } from '@/lib/api';
import { useSession } from '@/providers/session-provider';
import { useToast } from '@/providers/toast-provider';

/** Enter the code emailed after sign-up. Members can skip it and come back from Settings, but can't post until they do. */
export default function VerifyEmailScreen() {
  const { colors } = useTheme();
  const { token, user, updateUser } = useSession();
  const { showToast } = useToast();
  // Development only: the code arrives as a param from sign-up when no email provider is set up.
  const params = useLocalSearchParams<{ devCode?: string; sent?: string }>();
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState(params.devCode ?? '');
  const [resendIn, setResendIn] = useState(params.sent ? 60 : 0);
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timeout = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timeout);
  }, [resendIn]);

  if (!token || !user) {
    return <Redirect href="/auth" />;
  }

  const finish = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

  async function verify(value = code) {
    setError('');
    setIsBusy(true);
    try {
      const response = await api.verifyEmail(token!, value);
      await updateUser(response.user);
      showToast('Email confirmed. You can post now.', 'success');
      finish();
    } catch (verifyError) {
      setError(getErrorMessage(verifyError));
    } finally {
      setIsBusy(false);
    }
  }

  async function resend() {
    setError('');
    try {
      const response = await api.resendEmailCode(token!);
      if (response.alreadyVerified) {
        await updateUser({ ...user!, needsEmailVerification: false });
        finish();
        return;
      }
      setCode('');
      setDevCode(response.devCode ?? '');
      setResendIn(response.resendInSeconds ?? 60);
      showToast('New code sent. Check your inbox and spam folder.', 'info');
    } catch (resendError) {
      setError(getErrorMessage(resendError));
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title="Confirm your email" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
          <Feather name="mail" size={26} color={colors.primary} />
        </View>
        <AppText variant="callout" color="textMuted">
          We sent a 6-digit code to <AppText variant="label">{user.email}</AppText>. Enter it to start posting and selling. It can take a
          minute to arrive; check your spam folder too.
        </AppText>
        <CodeInput
          value={code}
          onChange={(digits) => {
            setCode(digits);
            setError('');
          }}
          onComplete={(digits) => void verify(digits)}
          invalid={Boolean(error)}
          autoFocus
        />
        {devCode ? (
          <AppText variant="caption" color="textMuted" style={styles.center}>
            Development mode, no email sent. Your code is {devCode}.
          </AppText>
        ) : null}
        {error ? (
          <View style={[styles.error, { backgroundColor: colors.dangerSoft }]}>
            <Feather name="alert-circle" size={16} color={colors.danger} />
            <AppText variant="callout" color="danger" style={styles.flex}>
              {error}
            </AppText>
          </View>
        ) : null}
        <Button label="Confirm email" onPress={() => void verify()} loading={isBusy} disabled={code.length !== 6} fullWidth />
        <View style={styles.row}>
          <Pressable accessibilityRole="button" onPress={finish} hitSlop={10}>
            <AppText variant="label" color="textMuted">
              I&apos;ll do this later
            </AppText>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => void resend()} disabled={resendIn > 0} hitSlop={10}>
            <AppText variant="label" color={resendIn > 0 ? 'textSubtle' : 'primary'}>
              {resendIn > 0 ? `Resend in ${resendIn}s` : 'Send a new code'}
            </AppText>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: ScreenPadding + Spacing.xs, paddingTop: Spacing.md, paddingBottom: Spacing.xxl, gap: Spacing.md },
  icon: { width: 56, height: 56, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  center: { alignSelf: 'center' },
  flex: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  error: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, padding: Spacing.sm, borderRadius: Radius.md },
});
