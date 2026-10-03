import Feather from '@expo/vector-icons/Feather';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { LocationFields } from '@/components/location/location-fields';
import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ListSkeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/state-views';
import { TextField } from '@/components/ui/text-field';
import { joinLocation, splitLocation } from '@/constants/counties';
import { Radius, ScreenPadding, Spacing } from '@/constants/theme';
import { queryKeys, useMyProfile } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import { api, getErrorMessage } from '@/lib/api';
import type { ApiUser, UploadableAsset } from '@/lib/types';
import { useSession } from '@/providers/session-provider';
import { useToast } from '@/providers/toast-provider';

export default function EditProfileScreen() {
  const profile = useMyProfile();

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title="Edit profile" closeIcon />
      {profile.isPending ? (
        <View style={styles.content}>
          <ListSkeleton count={1} />
        </View>
      ) : profile.isError ? (
        <ErrorState error={profile.error} onRetry={() => void profile.refetch()} retrying={profile.isFetching} />
      ) : (
        <EditForm profile={profile.data.profile} />
      )}
    </KeyboardAvoidingView>
  );
}

function EditForm({ profile }: { profile: ApiUser }) {
  const { colors } = useTheme();
  const { token, updateUser } = useSession();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [name, setName] = useState(profile.name ?? '');
  const initialLocation = splitLocation(profile.location);
  const [county, setCounty] = useState(initialLocation.county);
  const [town, setTown] = useState(initialLocation.town);
  const [bio, setBio] = useState(profile.bio ?? '');
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [interests, setInterests] = useState((profile.interests ?? []).join(', '));
  const [avatar, setAvatar] = useState<UploadableAsset | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function pickAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Allow FarmConnect to use your photos in your phone settings to set a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85 });

    if (!result.canceled) {
      const asset = result.assets[0];
      setAvatar({ uri: asset.uri, type: asset.mimeType || 'image/jpeg', name: asset.fileName || `avatar-${Date.now()}.jpg` });
    }
  }

  async function save() {
    if (!token) {
      return;
    }

    if (!name.trim()) {
      showToast('Your name can’t be empty', 'error');
      return;
    }

    setIsSaving(true);

    try {
      const response = await api.updateProfile(token, {
        name: name.trim(),
        location: joinLocation(town, county),
        bio: bio.trim(),
        phone: phone.trim(),
        interests: interests
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        avatar,
      });
      await updateUser(response.user);
      void queryClient.invalidateQueries({ queryKey: queryKeys.myProfile });
      showToast('Profile updated');
      router.back();
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
      setIsSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Pressable accessibilityRole="button" accessibilityLabel="Change profile photo" onPress={() => void pickAvatar()} style={styles.avatarPicker}>
        <View>
          <Avatar name={name || profile.name} imageUrl={avatar?.uri ?? profile.avatarUrl} size={88} />
          <View style={[styles.cameraBadge, { backgroundColor: colors.primary, borderColor: colors.background }]}>
            <Feather name="camera" size={14} color={colors.onPrimary} />
          </View>
        </View>
        <AppText variant="label" color="primary">
          Change photo
        </AppText>
      </Pressable>

      <TextField label="Name" value={name} onChangeText={setName} placeholder="Your name or farm name" />
      <LocationFields
        county={county}
        town={town}
        onChangeCounty={setCounty}
        onChangeTown={setTown}
        hint={county ? undefined : 'Add your county to see local prices and advice for your area.'}
      />
      <TextField
        label="About you"
        value={bio}
        onChangeText={setBio}
        placeholder="What do you grow or buy? What are you good at?"
        hint="A good bio helps other farmers decide whose advice to trust."
        multiline
      />
      <TextField
        label="Phone"
        value={phone}
        onChangeText={setPhone}
        placeholder="07XX XXX XXX"
        keyboardType="phone-pad"
        icon="phone"
        hint="Shown to buyers on your listings once you're verified."
      />
      <TextField label="Interests" value={interests} onChangeText={setInterests} placeholder="Dairy, tomatoes, irrigation" hint="Separate with commas." />
      <Button label="Save changes" onPress={() => void save()} loading={isSaving} fullWidth />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: ScreenPadding, paddingTop: Spacing.xs, paddingBottom: Spacing.xxl, gap: Spacing.lg },
  avatarPicker: { alignItems: 'center', gap: Spacing.xs },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: Radius.pill,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
