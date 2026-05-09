import Feather from '@expo/vector-icons/Feather';
import { useFocusEffect } from '@react-navigation/native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, BackHandler, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSession } from '@/providers/session-provider';

const roles = [
  { id: 'farmer', label: 'Farmer' },
  { id: 'buyer', label: 'Buyer' },
  { id: 'hobbyist', label: 'Hobbyist' },
] as const;

const defaultInterests = ['Market tea', 'Buyer demand'];

export default function AuthScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const params = useLocalSearchParams<{ mode?: string }>();
  const initialMode = params.mode === 'signup' ? 'signup' : 'login';
  const { token, isLoading, register, login, continueAsGuest, markIntroSeen } = useSession();

  const [currentMode, setCurrentMode] = useState<'login' | 'signup'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [location, setLocation] = useState('');
  const [selectedRole, setSelectedRole] = useState<(typeof roles)[number]['id']>('buyer');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (currentMode === 'signup') {
          switchMode('login');
          return true;
        }

        router.replace('/get-started');
        return true;
      });

      return () => subscription.remove();
    }, [currentMode])
  );

  if (!isLoading && token) {
    return <Redirect href="/(tabs)" />;
  }

  function switchMode(nextMode: 'login' | 'signup') {
    setCurrentMode(nextMode);
    setSubmitError('');
  }

  async function handleSubmit() {
    setSubmitError('');

    if (currentMode === 'signup') {
      if (password !== confirmPassword) {
        setSubmitError('Passwords do not match.');
        return;
      }

      if (!acceptedTerms) {
        setSubmitError('Please accept the terms and conditions.');
        return;
      }
    }

    setIsSubmitting(true);
    markIntroSeen();

    try {
      if (currentMode === 'login') {
        await login(email.trim(), password);
      } else {
        await register({
          name: name.trim(),
          email: email.trim(),
          password,
          location: location.trim() || 'Unknown',
          role: selectedRole,
          interests: defaultInterests,
        });
      }

      router.replace('/(tabs)');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleGuest() {
    markIntroSeen();
    continueAsGuest();
    router.replace('/(tabs)');
  }

  function showTerms() {
    Alert.alert(
      'Terms and conditions',
      'By creating a FarmConnect account, you agree to use accurate profile information, trade respectfully, follow marketplace rules, and keep community discussions useful and safe.'
    );
  }

  const isSignup = currentMode === 'signup';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => router.replace('/get-started')} style={[styles.iconButton, { backgroundColor: palette.surface }]}>
            <Feather name="arrow-left" size={18} color={palette.text} />
          </Pressable>
          <Text style={[styles.brand, { color: palette.tint }]}>FarmConnect</Text>
        </View>

        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: palette.text }]}>{isSignup ? 'Create account' : 'Log in'}</Text>
          <Text style={[styles.subtitle, { color: palette.muted }]}>
            {isSignup ? 'Start with the basics. You can complete your profile later.' : 'Welcome back.'}
          </Text>
        </View>

        <View style={styles.form}>
          {isSignup ? (
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Name or business name"
              placeholderTextColor={palette.muted}
              style={[styles.input, { color: palette.text, backgroundColor: palette.surface }]}
            />
          ) : null}

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor={palette.muted}
            style={[styles.input, { color: palette.text, backgroundColor: palette.surface }]}
          />

          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
            placeholderTextColor={palette.muted}
            style={[styles.input, { color: palette.text, backgroundColor: palette.surface }]}
          />

          {isSignup ? (
            <>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm password"
                secureTextEntry
                placeholderTextColor={palette.muted}
                style={[styles.input, { color: palette.text, backgroundColor: palette.surface }]}
              />
              <TextInput
                value={location}
                onChangeText={setLocation}
                placeholder="Location"
                placeholderTextColor={palette.muted}
                style={[styles.input, { color: palette.text, backgroundColor: palette.surface }]}
              />
              <View style={styles.roleRow}>
                {roles.map((role) => {
                  const isSelected = selectedRole === role.id;

                  return (
                    <Pressable
                      key={role.id}
                      onPress={() => setSelectedRole(role.id)}
                      style={[
                        styles.roleButton,
                        { backgroundColor: isSelected ? palette.tint : palette.surface },
                      ]}>
                      <Text style={[styles.roleText, { color: isSelected ? '#FFFFFF' : palette.text }]}>{role.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Pressable onPress={() => setAcceptedTerms((current) => !current)} style={styles.termsRow}>
                <View
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: acceptedTerms ? palette.tint : palette.surface,
                      borderColor: acceptedTerms ? palette.tint : palette.border,
                    },
                  ]}>
                  {acceptedTerms ? <Feather name="check" size={14} color="#FFFFFF" /> : null}
                </View>
                <Text style={[styles.termsText, { color: palette.muted }]}>
                  I agree to the{' '}
                  <Text onPress={showTerms} style={{ color: palette.tint, fontWeight: '800' }}>
                    terms and conditions
                  </Text>
                  .
                </Text>
              </Pressable>
            </>
          ) : null}

          {submitError ? <Text style={[styles.error, { color: palette.accent }]}>{submitError}</Text> : null}

          <Pressable disabled={isSubmitting} onPress={handleSubmit} style={[styles.primaryButton, { backgroundColor: palette.tint }]}>
            <Text style={styles.primaryButtonText}>
              {isSubmitting ? (isSignup ? 'Creating...' : 'Logging in...') : isSignup ? 'Create account' : 'Log in'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.links}>
          <Pressable onPress={() => switchMode(isSignup ? 'login' : 'signup')} hitSlop={10}>
            <Text style={[styles.linkText, { color: palette.text }]}>
              {isSignup ? 'Already have an account? Log in' : "Don't have an account yet? Create one"}
            </Text>
          </Pressable>
          <Pressable onPress={handleGuest} style={[styles.guestButton, { backgroundColor: palette.surface }]}>
            <Text style={[styles.guestButtonText, { color: palette.text }]}>Browse as guest</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { flexGrow: 1, padding: 22, justifyContent: 'center', gap: 26 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: { width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  brand: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  titleBlock: { gap: 8 },
  title: { fontFamily: Fonts.rounded, fontSize: 34, fontWeight: '800', lineHeight: 40 },
  subtitle: { fontFamily: Fonts.sans, fontSize: 15, lineHeight: 22 },
  form: { gap: 12 },
  input: {
    minHeight: 52,
    borderRadius: 18,
    paddingHorizontal: 15,
    fontFamily: Fonts.sans,
    fontSize: 15,
  },
  roleRow: { flexDirection: 'row', gap: 8 },
  roleButton: { flex: 1, minHeight: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  roleText: { fontFamily: Fonts.rounded, fontSize: 13, fontWeight: '800' },
  termsRow: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingTop: 2 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  termsText: { flex: 1, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19 },
  error: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 18 },
  primaryButton: { minHeight: 52, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  primaryButtonText: { color: '#FFFFFF', fontFamily: Fonts.rounded, fontSize: 15, fontWeight: '800' },
  links: { alignItems: 'center', gap: 14 },
  linkText: { fontFamily: Fonts.rounded, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  guestButton: { minHeight: 48, borderRadius: 999, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center' },
  guestButtonText: { fontFamily: Fonts.rounded, fontSize: 14, fontWeight: '800' },
});
