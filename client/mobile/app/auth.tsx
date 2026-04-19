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

  const selectedRoleCopy = useMemo(
    () => roles.find((role) => role.id === selectedRole) ?? roles[1],
    [selectedRole]
  );

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
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.heroShell, { backgroundColor: palette.backgroundSecondary }]}>
          <View style={[styles.glowLarge, { backgroundColor: `${palette.accent}20` }]} />
          <View style={[styles.glowSmall, { backgroundColor: `${palette.tint}16` }]} />
          <View style={[styles.heroBadge, { backgroundColor: palette.surfaceRaised }]}>
            <Feather name={currentMode === 'signup' ? 'star' : 'log-in'} size={14} color={palette.tint} />
            <Text style={[styles.heroBadgeText, { color: palette.text }]}>
              {currentMode === 'signup' ? 'Set up your space' : 'Pick up where you left off'}
            </Text>
          </View>

          <Text style={[styles.eyebrow, { color: palette.accent }]}>
            {currentMode === 'signup' ? 'Create your FarmConnect identity' : 'Welcome back to FarmConnect'}
          </Text>
          <Text style={[styles.title, { color: palette.text }]}>
            {currentMode === 'signup'
              ? 'Your feed, marketplace, and communities start with the role you choose.'
              : 'Log in and jump straight back into the feed.'}
          </Text>
          <Text style={[styles.subtitle, { color: palette.muted }]}>
            Passwords are hashed on the backend before they are stored, and this mobile flow is now stable for Expo Go.
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
            <View style={[styles.avatarCard, { backgroundColor: palette.surfaceRaised }]}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Profile photo</Text>
              <Text style={[styles.sectionMeta, { color: palette.muted }]}>
                Optional for now, but it makes your account feel instantly more real in the feed.
              </Text>
              <View style={styles.avatarRow}>
                <View style={[styles.avatarPreview, { backgroundColor: palette.surface }]}>
                  {avatar ? (
                    <Image source={{ uri: avatar.uri }} contentFit="cover" style={styles.avatarImage} />
                  ) : (
                    <Feather name="user" size={30} color={palette.muted} />
                  )}
                </View>
                <Pressable onPress={pickAvatar} style={[styles.avatarButton, { backgroundColor: palette.surface }]}>
                  <Text style={[styles.avatarButtonText, { color: palette.text }]}>
                    {avatar ? 'Change photo' : 'Choose photo'}
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Choose your lane</Text>
              {roles.map((role) => (
                <Pressable
                  key={role.id}
                  onPress={() => setSelectedRole(role.id)}
                  style={[
                    styles.roleCard,
                    {
                      backgroundColor: selectedRole === role.id ? `${palette.accent}12` : palette.surfaceRaised,
                    },
                  ]}>
                  <Text style={[styles.roleLabel, { color: palette.text }]}>{role.label}</Text>
                  <Text style={[styles.roleBlurb, { color: palette.muted }]}>{role.blurb}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Tune your feed</Text>
              <Text style={[styles.sectionMeta, { color: palette.muted }]}>{selectedRoleCopy.blurb}</Text>
              <View style={styles.chips}>
                {interestOptions.map((interest) => {
                  const isSelected = selectedInterests.includes(interest);

                  return (
                    <Pressable
                      key={interest}
                      onPress={() => toggleInterest(interest)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isSelected ? `${palette.tint}16` : palette.surfaceRaised,
                        },
                      ]}>
                      <Text style={[styles.chipText, { color: isSelected ? palette.tint : palette.text }]}>
                        {interest}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </>
        ) : null}

        <View style={[styles.formCard, { backgroundColor: palette.surfaceRaised }]}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>
            {currentMode === 'signup' ? 'Set up your account' : 'Log in'}
          </Text>

          {currentMode === 'signup' ? (
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Name or business name"
              placeholderTextColor={palette.muted}
              style={[styles.input, { color: palette.text, borderColor: palette.border, backgroundColor: palette.surface }]}
            />
          ) : null}

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor={palette.muted}
            style={[styles.input, { color: palette.text, borderColor: palette.border, backgroundColor: palette.surface }]}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
            placeholderTextColor={palette.muted}
            style={[styles.input, { color: palette.text, borderColor: palette.border, backgroundColor: palette.surface }]}
          />

          {currentMode === 'signup' ? (
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="Location"
              placeholderTextColor={palette.muted}
              style={[styles.input, { color: palette.text, borderColor: palette.border, backgroundColor: palette.surface }]}
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
            style={[styles.secondaryButton, { borderColor: palette.border, backgroundColor: palette.surface }]}>
            <Text style={[styles.secondaryButtonText, { color: palette.text }]}>Use demo buyer</Text>
          </Pressable>
        </View>

        <Pressable onPress={() => router.replace('/get-started')} style={styles.backLink}>
          <Text style={[styles.backLinkText, { color: palette.muted }]}>Back to get started</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 20, gap: 18, paddingBottom: 40 },
  heroShell: { borderRadius: 32, padding: 18, overflow: 'hidden', gap: 12 },
  heroBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  heroBadgeText: { fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '700' },
  glowLarge: { position: 'absolute', width: 180, height: 180, borderRadius: 999, right: -30, top: -44 },
  glowSmall: { position: 'absolute', width: 100, height: 100, borderRadius: 999, left: -18, bottom: -18 },
  eyebrow: { fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2 },
  title: { fontFamily: Fonts.rounded, fontSize: 31, fontWeight: '700', lineHeight: 37 },
  subtitle: { fontFamily: Fonts.sans, fontSize: 15, lineHeight: 22 },
  modeSwitch: { borderRadius: 20, padding: 6, flexDirection: 'row', gap: 8 },
  modeButton: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  modeButtonText: { fontFamily: Fonts.rounded, fontSize: 14, fontWeight: '700' },
  avatarCard: { borderRadius: 26, padding: 18, gap: 12 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarPreview: { width: 72, height: 72, borderRadius: 999, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarButton: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 11 },
  avatarButtonText: { fontFamily: Fonts.rounded, fontSize: 13, fontWeight: '700' },
  section: { gap: 10 },
  sectionTitle: { fontFamily: Fonts.rounded, fontSize: 22, fontWeight: '700' },
  sectionMeta: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 21 },
  roleCard: { borderRadius: 22, padding: 16, gap: 6 },
  roleLabel: { fontFamily: Fonts.rounded, fontSize: 16, fontWeight: '700' },
  roleBlurb: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  chipText: { fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '700' },
  formCard: { borderRadius: 26, padding: 18, gap: 12 },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontFamily: Fonts.sans,
    fontSize: 14,
  },
  error: { fontFamily: Fonts.sans, fontSize: 13 },
  primaryButton: { borderRadius: 999, paddingVertical: 15, alignItems: 'center' },
  primaryButtonText: { color: '#ffffff', fontFamily: Fonts.rounded, fontSize: 15, fontWeight: '700' },
  secondaryButton: { borderRadius: 999, borderWidth: 1, paddingVertical: 15, alignItems: 'center' },
  secondaryButtonText: { fontFamily: Fonts.rounded, fontSize: 15, fontWeight: '700' },
  backLink: { alignItems: 'center', paddingVertical: 4 },
  backLinkText: { fontFamily: Fonts.rounded, fontSize: 13, fontWeight: '700' },
});
