import Feather from '@expo/vector-icons/Feather';
import { useFocusEffect } from '@react-navigation/native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LocationFields } from '@/components/location/location-fields';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { TextField } from '@/components/ui/text-field';
import { joinLocation } from '@/constants/counties';
import { Radius, ScreenPadding, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getErrorMessage } from '@/lib/api';
import { useSession } from '@/providers/session-provider';

const roles = [
  { value: 'farmer', label: 'Farmer' },
  { value: 'buyer', label: 'Buyer' },
  { value: 'hobbyist', label: 'Hobbyist' },
] as const;

type Role = (typeof roles)[number]['value'];

const defaultInterests = ['Market tea', 'Buyer demand'];

export default function AuthScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ mode?: string }>();
  const { token, isLoading, register, login, continueAsGuest, markIntroSeen } = useSession();

  const [mode, setMode] = useState<'login' | 'signup'>(params.mode === 'signup' ? 'signup' : 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [county, setCounty] = useState('');
  const [town, setTown] = useState('');
  const [role, setRole] = useState<Role>('farmer');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSignup = mode === 'signup';

  const switchMode = useCallback((next: 'login' | 'signup') => {
    setMode(next);
    setError('');
  }, []);

  // Follow ?mode= changes (and params that arrive after the first render on web).
  useEffect(() => {
    if (params.mode === 'signup' || params.mode === 'login') {
      switchMode(params.mode);
    }
  }, [params.mode, switchMode]);

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/get-started');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (mode === 'signup') {
          switchMode('login');
        } else {
          goBack();
        }
        return true;
      });

      return () => subscription.remove();
    }, [goBack, mode, switchMode])
  );

  if (!isLoading && token) {
    return <Redirect href="/(tabs)" />;
  }

  function validate() {
    if (!email.trim() || !password) {
      return 'Enter your email and password.';
    }

    if (isSignup) {
      if (!name.trim()) {
        return 'Tell us your name or farm name.';
      }
      if (password.length < 6) {
        return 'Use at least 6 characters for your password.';
      }
      if (password !== confirmPassword) {
        return "Passwords don't match.";
      }
      if (!county) {
        return 'Choose your county so we can show you nearby farmers, prices, and advice.';
      }
      if (!acceptedTerms) {
        return 'Please accept the terms to continue.';
      }
    }

    return '';
  }

  async function submit() {
    const problem = validate();
    setError(problem);

    if (problem) {
      return;
    }

    setIsSubmitting(true);
    markIntroSeen();

    try {
      if (isSignup) {
        await register({
          name: name.trim(),
          email: email.trim(),
          password,
          location: joinLocation(town, county),
          role,
          interests: defaultInterests,
        });
      } else {
        await login(email.trim(), password);
      }

      router.replace('/(tabs)');
    } catch (submitError) {
      setError(getErrorMessage(submitError, 'Could not sign you in.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  function browseAsGuest() {
    continueAsGuest();
    router.replace('/(tabs)');
  }

  function showTerms() {
    Alert.alert(
      'Terms and conditions',
      'By creating a FarmConnect account, you agree to use accurate profile information, trade respectfully, follow marketplace rules, and keep community discussions useful and safe.'
    );
  }

  const passwordToggle = (
    <Pressable accessibilityLabel={showPassword ? 'Hide password' : 'Show password'} onPress={() => setShowPassword((value) => !value)} hitSlop={8}>
      <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={colors.textSubtle} />
    </Pressable>
  );

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.xs, paddingBottom: insets.bottom + Spacing.lg }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <IconButton icon="arrow-left" label="Go back" onPress={goBack} />

        <View style={styles.heading}>
          <AppText variant="display">{isSignup ? 'Join FarmConnect' : 'Welcome back'}</AppText>
          <AppText variant="callout" color="textMuted">
            {isSignup ? 'It takes a minute. You can fill in your profile later.' : 'Sign in to pick up where you left off.'}
          </AppText>
        </View>

        <View style={styles.form}>
          {isSignup ? (
            <>
              <View style={styles.group}>
                <AppText variant="label">I am a</AppText>
                <SegmentedControl options={roles} value={role} onChange={setRole} />
              </View>
              <TextField label="Name" value={name} onChangeText={setName} placeholder="Your name or farm name" autoComplete="name" />
            </>
          ) : null}
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder={isSignup ? 'At least 6 characters' : 'Your password'}
            secureTextEntry={!showPassword}
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            trailing={passwordToggle}
            onSubmitEditing={isSignup ? undefined : () => void submit()}
          />
          {isSignup ? (
            <>
              <TextField
                label="Confirm password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Type it again"
                secureTextEntry={!showPassword}
                autoComplete="new-password"
              />
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
                    { borderColor: acceptedTerms ? colors.primary : colors.border, backgroundColor: acceptedTerms ? colors.primary : colors.surface },
                  ]}>
                  {acceptedTerms ? <Feather name="check" size={14} color={colors.onPrimary} /> : null}
                </View>
                <AppText variant="callout" color="textMuted" style={styles.termsText}>
                  I agree to the{' '}
                  <AppText variant="label" color="primary" onPress={showTerms}>
                    terms and conditions
                  </AppText>
                </AppText>
              </Pressable>
            </>
          ) : null}

          {error ? (
            <View style={[styles.error, { backgroundColor: colors.dangerSoft }]}>
              <Feather name="alert-circle" size={16} color={colors.danger} />
              <AppText variant="callout" color="danger" style={styles.termsText}>
                {error}
              </AppText>
            </View>
          ) : null}

          <Button label={isSignup ? 'Create account' : 'Sign in'} onPress={() => void submit()} loading={isSubmitting} fullWidth />
        </View>

        <View style={styles.footer}>
          <Pressable onPress={() => switchMode(isSignup ? 'login' : 'signup')} hitSlop={10}>
            <AppText variant="callout" color="textMuted" align="center">
              {isSignup ? 'Already have an account? ' : 'New to FarmConnect? '}
              <AppText variant="label" color="primary">
                {isSignup ? 'Sign in' : 'Create an account'}
              </AppText>
            </AppText>
          </Pressable>
          <Button label="Browse as guest" variant="ghost" onPress={browseAsGuest} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: ScreenPadding + Spacing.xs, gap: Spacing.xl },
  heading: { gap: Spacing.xs },
  form: { gap: Spacing.md },
  group: { gap: Spacing.xs },
  terms: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  checkbox: { width: 22, height: 22, borderRadius: Radius.sm - 2, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  termsText: { flex: 1 },
  error: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, padding: Spacing.sm, borderRadius: Radius.md },
  footer: { alignItems: 'center', gap: Spacing.xs, marginTop: 'auto' },
});
