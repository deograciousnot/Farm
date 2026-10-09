import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { CodeInput } from '@/components/auth/code-input';
import { LocationFields } from '@/components/location/location-fields';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { TextField } from '@/components/ui/text-field';
import { joinLocation } from '@/constants/counties';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, getErrorMessage } from '@/lib/api';
import { useSession } from '@/providers/session-provider';

type Step = 'phone' | 'code' | 'profile';

const roles = [
  { value: 'farmer', label: 'Farmer' },
  { value: 'buyer', label: 'Buyer' },
  { value: 'hobbyist', label: 'Hobbyist' },
] as const;

/** Phone number → SMS code → (new members only) a short profile. */
export function PhoneSignIn({ onUseEmail }: { onUseEmail: () => void }) {
  const { colors } = useTheme();
  const { signInWithToken, markIntroSeen } = useSession();
  const [step, setStep] = useState<Step>('phone');
  const [phoneInput, setPhoneInput] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [devCode, setDevCode] = useState('');
  const [signupToken, setSignupToken] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<(typeof roles)[number]['value']>('farmer');
  const [county, setCounty] = useState('');
  const [town, setTown] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const codeInput = useRef<TextInput>(null);

  // Countdown before another code can be requested.
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

  const sendCode = (number = phoneInput) =>
    run(async () => {
      const response = await api.requestPhoneCode(number);
      setPhone(response.phone);
      setCode('');
      setResendIn(response.resendInSeconds);
      setStep('code');
      // Local development without an SMS provider: the server returns the code instead of texting it.
      setDevCode(response.devCode ?? '');
      setTimeout(() => codeInput.current?.focus(), 300);
    });

  const verify = (value = code) =>
    run(async () => {
      const response = await api.verifyPhoneCode(phone, value);
      markIntroSeen();
      if (response.needsProfile) {
        setSignupToken(response.signupToken);
        setStep('profile');
        return;
      }
      await signInWithToken(response.token, response.user);
      router.replace('/(tabs)');
    });

  const createAccount = () =>
    run(async () => {
      if (name.trim().length < 2) throw new Error('Tell us your name or farm name.');
      if (!county) throw new Error('Choose your county so we can show you local prices and advice.');
      if (!acceptedTerms) throw new Error('Please accept the terms to continue.');
      const response = await api.completePhoneSignup({ signupToken, name: name.trim(), role, location: joinLocation(town, county) });
      await signInWithToken(response.token, response.user);
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

  if (step === 'phone') {
    return (
      <View style={styles.form}>
        <TextField
          label="Phone number"
          value={phoneInput}
          onChangeText={setPhoneInput}
          placeholder="0712 345 678"
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          icon="phone"
          hint="We'll text you a 6-digit code. No password needed."
          onSubmitEditing={() => void sendCode()}
        />
        {errorBanner}
        <Button
          label="Send code"
          onPress={() => void sendCode()}
          loading={isBusy}
          disabled={phoneInput.replace(/\D/g, '').length < 9}
          fullWidth
        />
        <Pressable accessibilityRole="button" onPress={onUseEmail} hitSlop={10} style={styles.center}>
          <AppText variant="label" color="primary">
            Use email and password instead
          </AppText>
        </Pressable>
      </View>
    );
  }

  if (step === 'code') {
    return (
      <View style={styles.form}>
        <AppText variant="callout" color="textMuted">
          Enter the code we sent to <AppText variant="label">{phone}</AppText>.
        </AppText>
        <CodeInput
          ref={codeInput}
          value={code}
          onChange={(digits) => {
            setCode(digits);
            setError('');
          }}
          onComplete={(digits) => void verify(digits)}
          invalid={Boolean(error)}
        />
        {devCode ? (
          <AppText variant="caption" color="textMuted" style={styles.center}>
            Development mode, no SMS sent. Your code is {devCode}.
          </AppText>
        ) : null}
        {errorBanner}
        <Button label="Continue" onPress={() => void verify()} loading={isBusy} disabled={code.length !== 6} fullWidth />
        <View style={styles.row}>
          <Pressable accessibilityRole="button" onPress={() => setStep('phone')} hitSlop={10}>
            <AppText variant="label" color="primary">
              Change number
            </AppText>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => void sendCode(phone)} disabled={resendIn > 0 || isBusy} hitSlop={10}>
            <AppText variant="label" color={resendIn > 0 ? 'textSubtle' : 'primary'}>
              {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
            </AppText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.form}>
      <AppText variant="callout" color="textMuted">
        Your number is confirmed. A few details and you&apos;re in.
      </AppText>
      <View style={styles.group}>
        <AppText variant="label">I am a</AppText>
        <SegmentedControl options={roles} value={role} onChange={setRole} />
      </View>
      <TextField label="Name" value={name} onChangeText={setName} placeholder="Your name or farm name" autoComplete="name" />
      <LocationFields
        countyLabel="Where do you farm or buy?"
        county={county}
        town={town}
        onChangeCounty={setCounty}
        onChangeTown={setTown}
        hint="We use this for local prices, nearby farmers, and advice for your area."
      />
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: acceptedTerms }}
        onPress={() => setAcceptedTerms((value) => !value)}
        style={styles.terms}>
        <View
          style={[
            styles.checkbox,
            {
              borderColor: acceptedTerms ? colors.primary : colors.border,
              backgroundColor: acceptedTerms ? colors.primary : colors.surface,
            },
          ]}>
          {acceptedTerms ? <Feather name="check" size={14} color={colors.onPrimary} /> : null}
        </View>
        <AppText variant="callout" color="textMuted" style={styles.flex}>
          I agree to the{' '}
          <AppText variant="label" color="primary" onPress={() => router.push('/legal/terms')}>
            terms of use
          </AppText>{' '}
          and{' '}
          <AppText variant="label" color="primary" onPress={() => router.push('/legal/privacy')}>
            privacy policy
          </AppText>
        </AppText>
      </Pressable>
      {errorBanner}
      <Button label="Create account" onPress={() => void createAccount()} loading={isBusy} fullWidth />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.md },
  group: { gap: Spacing.xs },
  flex: { flex: 1 },
  center: { alignSelf: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  error: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, padding: Spacing.sm, borderRadius: Radius.md },
  terms: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  checkbox: { width: 22, height: 22, borderRadius: Radius.sm - 2, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
