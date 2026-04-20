import Feather from '@expo/vector-icons/Feather';
import * as ImagePicker from 'expo-image-picker';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { UploadableAsset } from '@/lib/types';
import { useSession } from '@/providers/session-provider';

const roles = [
  { id: 'farmer', label: 'Farmer', blurb: 'Post produce, answer questions, and sell with credibility.' },
  { id: 'buyer', label: 'Buyer', blurb: 'Browse suppliers, save listings, and shop with confidence.' },
  { id: 'hobbyist', label: 'Hobbyist', blurb: 'Learn and browse like a buyer, without seller privileges.' },
] as const;

const interestOptions = ['Crop health', 'Market tea', 'Buyer demand', 'Farm inputs', 'Greenhouse hacks'];

export default function AuthScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const params = useLocalSearchParams<{ mode?: string }>();
  const initialMode = params.mode === 'login' ? 'login' : 'signup';
  const { token, mode, isLoading, register, signInDemo, login, markIntroSeen } = useSession();

  const [currentMode, setCurrentMode] = useState<'signup' | 'login'>(initialMode);
  const [selectedRole, setSelectedRole] = useState<(typeof roles)[number]['id']>('buyer');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(['Market tea', 'Buyer demand']);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [location, setLocation] = useState('Nairobi');
  const [avatar, setAvatar] = useState<UploadableAsset | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedRoleCopy = useMemo(() => roles.find((role) => role.id === selectedRole) ?? roles[1], [selectedRole]);

  if (!isLoading && (token || mode === 'guest')) {
    return <Redirect href="/(tabs)" />;
  }

  function toggleInterest(interest: string) {
    setSelectedInterests((current) =>
      current.includes(interest) ? current.filter((item) => item !== interest) : [...current, interest]
    );
  }

  async function pickAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo access so you can choose a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];

    setAvatar({
      uri: asset.uri,
      type: asset.mimeType || 'image/jpeg',
      name: asset.fileName || `farmconnect-avatar-${Date.now()}.jpg`,
    });
  }

  async function handleSubmit() {
    setSubmitError('');
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
          location: location.trim(),
          role: selectedRole,
          interests: selectedInterests,
          avatar,
        });
      }

      router.replace('/(tabs)');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDemo() {
    setSubmitError('');
    setIsSubmitting(true);
    markIntroSeen();

    try {
      await signInDemo();
      router.replace('/(tabs)');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not enter demo.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function switchMode(nextMode: 'signup' | 'login') {
    setCurrentMode(nextMode);
    setSubmitError('');
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroShell, { backgroundColor: palette.backgroundSecondary }]}>
          <View style={[styles.glowLarge, { backgroundColor: `${palette.accent}18` }]} />
          <View style={[styles.glowSmall, { backgroundColor: `${palette.tint}16` }]} />
          <View style={styles.heroTop}>
            <View style={[styles.heroBadge, { backgroundColor: palette.surface }]}>
              <Feather name={currentMode === 'signup' ? 'user-plus' : 'log-in'} size={14} color={palette.tint} />
              <Text style={[styles.heroBadgeText, { color: palette.text }]}>
                {currentMode === 'signup' ? 'Create your identity' : 'Welcome back'}
              </Text>
            </View>
            <Pressable onPress={() => router.replace('/get-started')} hitSlop={8}>
              <Feather name="arrow-left" size={18} color={palette.text} />
            </Pressable>
          </View>

          <Text style={[styles.eyebrow, { color: palette.accent }]}>
            {currentMode === 'signup' ? 'New to FarmConnect' : 'Account sign in'}
          </Text>
          <Text style={[styles.title, { color: palette.text }]}>
            {currentMode === 'signup'
              ? 'Set up your role, voice, and profile in one clean flow.'
              : 'Jump back into your feed, marketplace, and communities.'}
          </Text>
          <Text style={[styles.subtitle, { color: palette.muted }]}>
            Passwords are hashed securely on the backend. Google and phone sign-in can plug into this flow next.
          </Text>
        </View>

        <View style={[styles.modeSwitch, { backgroundColor: palette.surface }]}>
          <Pressable
            onPress={() => switchMode('signup')}
            style={[styles.modeButton, { backgroundColor: currentMode === 'signup' ? palette.tint : 'transparent' }]}>
            <Text style={[styles.modeButtonText, { color: currentMode === 'signup' ? '#ffffff' : palette.text }]}>
              Create account
            </Text>
          </Pressable>
          <Pressable
            onPress={() => switchMode('login')}
            style={[styles.modeButton, { backgroundColor: currentMode === 'login' ? palette.accent : 'transparent' }]}>
            <Text style={[styles.modeButtonText, { color: currentMode === 'login' ? '#ffffff' : palette.text }]}>
              Log in
            </Text>
          </Pressable>
        </View>

        {currentMode === 'signup' ? (
          <>
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: palette.muted }]}>Role</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roleRow}>
                {roles.map((role) => (
                  <Pressable
                    key={role.id}
                    onPress={() => setSelectedRole(role.id)}
                    style={[
                      styles.roleCard,
                      { backgroundColor: selectedRole === role.id ? `${palette.tint}12` : palette.surface },
                    ]}>
                    <Text style={[styles.roleLabel, { color: selectedRole === role.id ? palette.tint : palette.text }]}>
                      {role.label}
                    </Text>
                    <Text style={[styles.roleBlurb, { color: palette.muted }]}>{role.blurb}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: palette.muted }]}>Profile photo</Text>
              <View style={[styles.avatarRow, { backgroundColor: palette.surface }]}>
                <View style={[styles.avatarPreview, { backgroundColor: palette.backgroundSecondary }]}>
                  {avatar ? (
                    <Image source={{ uri: avatar.uri }} contentFit="cover" style={styles.avatarImage} />
                  ) : (
                    <Feather name="user" size={28} color={palette.muted} />
                  )}
                </View>
                <View style={styles.avatarCopy}>
                  <Text style={[styles.avatarTitle, { color: palette.text }]}>Make your profile feel real</Text>
                  <Text style={[styles.avatarHint, { color: palette.muted }]}>
                    Optional now, useful later for trust and recognition in the feed.
                  </Text>
                </View>
                <Pressable onPress={pickAvatar} style={[styles.avatarButton, { backgroundColor: palette.backgroundSecondary }]}>
                  <Text style={[styles.avatarButtonText, { color: palette.text }]}>
                    {avatar ? 'Change' : 'Add'}
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: palette.muted }]}>Interests</Text>
              <Text style={[styles.sectionHint, { color: palette.muted }]}>{selectedRoleCopy.blurb}</Text>
              <View style={styles.chips}>
                {interestOptions.map((interest) => {
                  const isSelected = selectedInterests.includes(interest);

                  return (
                    <Pressable
                      key={interest}
                      onPress={() => toggleInterest(interest)}
                      style={[
                        styles.chip,
                        { backgroundColor: isSelected ? `${palette.accent}14` : palette.surface },
                      ]}>
                      <Text style={[styles.chipText, { color: isSelected ? palette.accent : palette.text }]}>
                        {interest}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </>
        ) : null}

        <View style={styles.formSection}>
          <Text style={[styles.sectionLabel, { color: palette.muted }]}>
            {currentMode === 'signup' ? 'Account details' : 'Login details'}
          </Text>

          {currentMode === 'signup' ? (
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
          {currentMode === 'signup' ? (
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="Location"
              placeholderTextColor={palette.muted}
              style={[styles.input, { color: palette.text, backgroundColor: palette.surface }]}
            />
          ) : null}

          {submitError ? <Text style={[styles.error, { color: palette.accent }]}>{submitError}</Text> : null}

          <Pressable disabled={isSubmitting} onPress={handleSubmit} style={[styles.primaryButton, { backgroundColor: palette.tint }]}>
            <Text style={styles.primaryButtonText}>
              {isSubmitting
                ? currentMode === 'signup'
                  ? 'Setting up...'
                  : 'Logging in...'
                : currentMode === 'signup'
                  ? 'Create account'
                  : 'Log in'}
            </Text>
          </Pressable>
          <Pressable
            disabled={isSubmitting}
            onPress={handleDemo}
            style={[styles.secondaryButton, { backgroundColor: palette.surface }]}>
            <Text style={[styles.secondaryButtonText, { color: palette.text }]}>Use demo buyer</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 18, gap: 16, paddingBottom: 36 },
  heroShell: { borderRadius: 32, padding: 18, gap: 12, overflow: 'hidden' },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  heroBadge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', gap: 8, alignItems: 'center' },
  heroBadgeText: { fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '700' },
  glowLarge: { position: 'absolute', width: 180, height: 180, borderRadius: 999, right: -30, top: -44 },
  glowSmall: { position: 'absolute', width: 100, height: 100, borderRadius: 999, left: -18, bottom: -18 },
  eyebrow: { fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2 },
  title: { fontFamily: Fonts.rounded, fontSize: 31, fontWeight: '700', lineHeight: 38 },
  subtitle: { fontFamily: Fonts.sans, fontSize: 15, lineHeight: 22 },
  modeSwitch: { borderRadius: 999, padding: 4, flexDirection: 'row', gap: 6 },
  modeButton: { flex: 1, borderRadius: 999, paddingVertical: 11, alignItems: 'center' },
  modeButtonText: { fontFamily: Fonts.rounded, fontSize: 13, fontWeight: '700' },
  section: { gap: 10 },
  sectionLabel: { fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2 },
  sectionHint: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19 },
  roleRow: { gap: 10, paddingRight: 12 },
  roleCard: { width: 210, borderRadius: 22, padding: 16, gap: 6 },
  roleLabel: { fontFamily: Fonts.rounded, fontSize: 16, fontWeight: '700' },
  roleBlurb: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19 },
  avatarRow: { borderRadius: 24, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center' },
  avatarPreview: { width: 68, height: 68, borderRadius: 999, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarCopy: { flex: 1, gap: 4 },
  avatarTitle: { fontFamily: Fonts.rounded, fontSize: 15, fontWeight: '700' },
  avatarHint: { fontFamily: Fonts.sans, fontSize: 12, lineHeight: 18 },
  avatarButton: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  avatarButtonText: { fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  chipText: { fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '700' },
  formSection: { gap: 10 },
  input: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 14, fontFamily: Fonts.sans, fontSize: 14 },
  error: { fontFamily: Fonts.sans, fontSize: 13 },
  primaryButton: { borderRadius: 999, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  primaryButtonText: { color: '#ffffff', fontFamily: Fonts.rounded, fontSize: 15, fontWeight: '700' },
  secondaryButton: { borderRadius: 999, paddingVertical: 15, alignItems: 'center' },
  secondaryButtonText: { fontFamily: Fonts.rounded, fontSize: 14, fontWeight: '700' },
});
