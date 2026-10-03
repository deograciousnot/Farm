import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { LocationFields } from '@/components/location/location-fields';
import { MediaPicker } from '@/components/ui/media-picker';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChipGroup } from '@/components/ui/chip';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { EmptyState } from '@/components/ui/state-views';
import { TextField } from '@/components/ui/text-field';
import { ScreenPadding, Spacing } from '@/constants/theme';
import { joinLocation, splitLocation } from '@/constants/counties';
import { LISTING_CATEGORIES, POST_TAGS } from '@/constants/topics';
import { queryKeys, useMyProfile } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import { api, getErrorMessage } from '@/lib/api';
import type { UploadableAsset } from '@/lib/types';
import { useSession } from '@/providers/session-provider';
import { useToast } from '@/providers/toast-provider';

type ComposerMode = 'post' | 'listing';

const modes = [
  { value: 'post', label: 'Field note' },
  { value: 'listing', label: 'Listing' },
] as const;

export default function ComposerScreen() {
  const params = useLocalSearchParams<{ mode?: ComposerMode }>();
  const { token, user } = useSession();
  const [mode, setMode] = useState<ComposerMode>(params.mode === 'listing' ? 'listing' : 'post');
  const isFarmer = user?.role === 'farmer';

  if (!token) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Create" closeIcon />
        <EmptyState
          icon="lock"
          title="Sign in to share"
          body="Posts and listings are tied to your profile so people know who they're learning from."
          action={{ label: 'Sign in', onPress: () => router.replace('/auth?mode=login') }}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title={mode === 'post' ? 'Share a field note' : 'New listing'} closeIcon />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {isFarmer ? <SegmentedControl options={modes} value={mode} onChange={setMode} /> : null}
        {mode === 'listing' && isFarmer ? <ListingForm token={token} defaultLocation={user?.location} /> : <PostForm token={token} defaultLocation={user?.location} canTagListings={isFarmer} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function PostForm({ token, defaultLocation, canTagListings }: { token: string; defaultLocation?: string; canTagListings: boolean }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const myProfile = useMyProfile();
  const [headline, setHeadline] = useState('');
  const [body, setBody] = useState('');
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [tag, setTag] = useState<string>(POST_TAGS[0]);
  const initialLocation = splitLocation(defaultLocation);
  const [county, setCounty] = useState(initialLocation.county);
  const [town, setTown] = useState(initialLocation.town);
  const [media, setMedia] = useState<UploadableAsset[]>([]);
  const [linkedProductId, setLinkedProductId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const listings = canTagListings ? (myProfile.data?.listings ?? []) : [];
  const missing = !headline.trim() ? 'Add a headline' : !body.trim() ? 'Write a few lines' : null;

  // Inserts a [[media:N]] marker at the cursor; the server turns these into inline images.
  function placeMedia(index: number) {
    const marker = `\n\n[[media:${index + 1}]]\n\n`;
    setBody(`${body.slice(0, selection.start)}${marker}${body.slice(selection.end)}`);
    const cursor = selection.start + marker.length;
    setSelection({ start: cursor, end: cursor });
  }

  async function submit() {
    setIsSubmitting(true);

    try {
      await api.createFeedPost(token, { headline: headline.trim(), body, tag, location: joinLocation(town, county), linkedProductId, media });
      void queryClient.invalidateQueries({ queryKey: queryKeys.feedRoot });
      void queryClient.invalidateQueries({ queryKey: queryKeys.myProfile });
      showToast('Posted to the feed');
      router.back();
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <TextField label="Headline" value={headline} onChangeText={setHeadline} placeholder="e.g. Drip lines halved my water bill" maxLength={120} />
      <TextField
        label="What happened?"
        value={body}
        onChangeText={setBody}
        selection={selection}
        onSelectionChange={(event) => setSelection(event.nativeEvent.selection)}
        placeholder="Share what you tried, what worked, and what you'd do differently…"
        multiline
      />
      <View style={styles.group}>
        <AppText variant="label">Photos or video</AppText>
        <MediaPicker
          value={media}
          onChange={setMedia}
          limit={4}
          allowVideo
          itemAction={media.length > 1 ? { label: (index) => `Place ${index + 1} here`, onPress: placeMedia } : undefined}
        />
        {media.length > 1 ? (
          <AppText variant="caption" color="textMuted">
            Put your cursor in the text, then tap “Place” to show that photo at that point.
          </AppText>
        ) : null}
      </View>
      <View style={styles.group}>
        <AppText variant="label">Topic</AppText>
        <ChipGroup options={POST_TAGS} value={tag} onChange={setTag} wrap />
      </View>
      <LocationFields countyLabel="Where is this happening?" county={county} town={town} onChangeCounty={setCounty} onChangeTown={setTown} />
      {listings.length ? (
        <View style={styles.group}>
          <AppText variant="label">Link one of your listings (optional)</AppText>
          <ChipGroup
            options={['None', ...listings.map((listing) => listing.name)]}
            value={listings.find((listing) => listing._id === linkedProductId)?.name ?? 'None'}
            onChange={(name) => setLinkedProductId(listings.find((listing) => listing.name === name)?._id ?? '')}
            wrap
          />
        </View>
      ) : null}
      <Button label={missing ?? 'Publish'} onPress={() => void submit()} disabled={Boolean(missing)} loading={isSubmitting} fullWidth />
    </>
  );
}

function ListingForm({ token, defaultLocation }: { token: string; defaultLocation?: string }) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>(LISTING_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('kg');
  const [stock, setStock] = useState('');
  const initialLocation = splitLocation(defaultLocation);
  const [county, setCounty] = useState(initialLocation.county);
  const [town, setTown] = useState(initialLocation.town);
  const [isOrganic, setIsOrganic] = useState(false);
  const [media, setMedia] = useState<UploadableAsset[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const missing = !name.trim()
    ? 'Add a product name'
    : !price.trim()
      ? 'Set a price'
      : !stock.trim()
        ? 'Add how much you have'
        : !description.trim()
          ? 'Add a short description'
          : !county
            ? 'Choose the county'
            : null;

  async function submit() {
    setIsSubmitting(true);

    try {
      await api.createProduct(token, {
        name: name.trim(),
        category,
        description: description.trim(),
        unit: unit.trim() || 'kg',
        price,
        stock,
        location: joinLocation(town, county),
        isOrganic,
        media,
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.marketplace });
      void queryClient.invalidateQueries({ queryKey: queryKeys.myProfile });
      showToast('Listing published');
      router.back();
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <View style={styles.group}>
        <AppText variant="label">Photos</AppText>
        <MediaPicker value={media} onChange={setMedia} limit={6} />
      </View>
      <TextField label="Product" value={name} onChangeText={setName} placeholder="e.g. Grade 1 Hass avocados" />
      <View style={styles.group}>
        <AppText variant="label">Category</AppText>
        <ChipGroup options={LISTING_CATEGORIES} value={category} onChange={setCategory} wrap />
      </View>
      <View style={styles.row}>
        <View style={styles.flex}>
          <TextField label="Price (KES)" value={price} onChangeText={(text) => setPrice(text.replace(/[^\d.]/g, ''))} placeholder="0" keyboardType="decimal-pad" />
        </View>
        <View style={styles.flex}>
          <TextField label="Per" value={unit} onChangeText={setUnit} placeholder="kg, crate, litre…" />
        </View>
      </View>
      <TextField label="Available" value={stock} onChangeText={(text) => setStock(text.replace(/\D/g, ''))} placeholder="0" keyboardType="number-pad" />
      <LocationFields
        countyLabel="Where is it?"
        county={county}
        town={town}
        onChangeCounty={setCounty}
        onChangeTown={setTown}
        hint="Buyers filter by county, and it keeps regional prices accurate."
      />
      <TextField
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="Quality, variety, harvest date, packaging, delivery options…"
        multiline
      />
      <Card tone="surfaceMuted" style={styles.switchRow}>
        <View style={styles.flex}>
          <AppText variant="label">Organic</AppText>
          <AppText variant="caption" color="textMuted">
            Grown without synthetic pesticides or fertiliser
          </AppText>
        </View>
        <Switch value={isOrganic} onValueChange={setIsOrganic} trackColor={{ true: colors.primary, false: colors.border }} thumbColor={colors.surface} />
      </Card>
      <Button label={missing ?? 'Publish listing'} onPress={() => void submit()} disabled={Boolean(missing)} loading={isSubmitting} fullWidth />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: ScreenPadding, paddingTop: Spacing.xs, paddingBottom: Spacing.xxl, gap: Spacing.lg },
  group: { gap: Spacing.xs },
  row: { flexDirection: 'row', gap: Spacing.sm },
  flex: { flex: 1 },
  switchRow: { flexDirection: 'row', alignItems: 'center' },
});
