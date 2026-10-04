import Feather from '@expo/vector-icons/Feather';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CodeInput } from '@/components/auth/code-input';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { Radius, ScreenPadding, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, getErrorMessage } from '@/lib/api';
import { useSession } from '@/providers/session-provider';
import { useToast } from '@/providers/toast-provider';

/** Email → code + new password → signed in. */
export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const { signInWithToken } = useSession();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ email?: string }>();
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [devCode, setDevCode] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timeout = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timeout);
  }, [resendIn]);

  async function run(action: () => Promise<void>) {
    setError('');
    setIsBusy(true);
    try {
      await action();
    } catch (actionError) {
      setError(getErrorMessage(actionError));
    } finally {
      setIsBusy(false);
    }
  }

  const sendCode = () =>
    run(async () => {
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) throw new Error('Enter the email address you signed up with.');
      const response = await api.forgotPassword(email.trim());
      setDevCode(response.devCode ?? '');
      setResendIn(response.resendInSeconds);
      setCode('');
      setStep('reset');
    });

  const reset = () =>
    run(async () => {
      if (code.length !== 6) throw new Error('Enter the 6-digit code from the email.');
      if (password.length < 6) throw new Error('Use at least 6 characters for your new password.');
      const response = await api.resetPassword({ email: email.trim(), code, newPassword: password });
      await signInWithToken(response.token, response.user);
      showToast('Password updated. Welcome back.', 'success');
      router.replace('/(tabs)');
    });

  const errorBanner = error ? (
    <View style={[styles.error, { backgroundColor: colors.dangerSoft }]}>
      <Feather name="alert-circle" size={16} color={colors.danger} />
      <AppText variant="callout" color="danger" style={styles.flex}>
        {error}
      </AppText>
    </View>
  ) : null;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title="Reset password" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === 'email' ? (
          <>
            <AppText variant="callout" color="textMuted">
              Enter the email you signed up with and we&apos;ll send you a code to set a new password.
            </AppText>
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onSubmitEditing={() => void sendCode()}
            />
            {errorBanner}
            <Button label="Send code" onPress={() => void sendCode()} loading={isBusy} fullWidth />
          </>
        ) : (
          <>
            <AppText variant="callout" color="textMuted">
              If <AppText variant="label">{email.trim()}</AppText> has a FarmConnect account, we&apos;ve emailed it a 6-digit code. Check
              your spam folder if it doesn&apos;t arrive in a minute.
            </AppText>
            <CodeInput
              value={code}
              onChange={(digits) => {
                setCode(digits);
                setError('');
              }}
              invalid={Boolean(error)}
              autoFocus
            />
            {devCode ? (
              <AppText variant="caption" color="textMuted" style={styles.center}>
                Development mode, no email sent. Your code is {devCode}.
              </AppText>
            ) : null}
            <TextField
              label="New password"
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              secureTextEntry={!showPassword}
              autoComplete="new-password"
              onSubmitEditing={() => void reset()}
              trailing={
                <Pressable
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  onPress={() => setShowPassword((value) => !value)}
                  hitSlop={8}>
                  <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={colors.textSubtle} />
                </Pressable>
              }
            />
            {errorBanner}
            <Button label="Set new password" onPress={() => void reset()} loading={isBusy} fullWidth />
            <View style={styles.row}>
              <Pressable accessibilityRole="button" onPress={() => setStep('email')} hitSlop={10}>
                <AppText variant="label" color="primary">
                  Change email
                </AppText>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => void sendCode()} disabled={resendIn > 0 || isBusy} hitSlop={10}>
                <AppText variant="label" color={resendIn > 0 ? 'textSubtle' : 'primary'}>
                  {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
                </AppText>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: ScreenPadding + Spacing.xs, paddingTop: Spacing.md, paddingBottom: Spacing.xxl, gap: Spacing.md },
  center: { alignSelf: 'center' },
  flex: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  error: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, padding: Spacing.sm, borderRadius: Radius.md },
});
