import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  type NativeSyntheticEvent,
  type TextInputSelectionChangeEventData,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { api } from '@/lib/api';
import type { Product, UploadableAsset } from '@/lib/types';
import { useSession } from '@/providers/session-provider';

type ComposerMode = 'post' | 'listing';

const postTags = ['Crop health', 'Market tea', 'Farm inputs', 'Knowledge', 'Community'];
const listingCategories = ['Vegetables', 'Fruits', 'Grains', 'Farm inputs'];

export default function ComposerModal() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { token, user } = useSession();
  const [mode, setMode] = useState<ComposerMode>('post');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<UploadableAsset[]>([]);
  const [submissionStage, setSubmissionStage] = useState<'idle' | 'preparing' | 'uploading' | 'publishing'>('idle');
  const [availableListings, setAvailableListings] = useState<Product[]>([]);
  const [linkedProductId, setLinkedProductId] = useState('');

  const [headline, setHeadline] = useState('');
  const [body, setBody] = useState('');
  const [bodySelection, setBodySelection] = useState({ start: 0, end: 0 });
  const [tag, setTag] = useState(postTags[0]);
  const [location, setLocation] = useState(user?.location ?? 'Nairobi');

  const [productName, setProductName] = useState('');
  const [productCategory, setProductCategory] = useState(listingCategories[0]);
  const [productDescription, setProductDescription] = useState('');
  const [productUnit, setProductUnit] = useState('kg');
  const [productPrice, setProductPrice] = useState('');
  const [productStock, setProductStock] = useState('');
  const [productLocation, setProductLocation] = useState(user?.location ?? 'Nairobi');
  const [isOrganic, setIsOrganic] = useState(false);

  const isSeller = user?.role === 'farmer';

  const title = useMemo(() => (mode === 'post' ? 'Share to feed' : 'Create listing'), [mode]);
  const hasVideo = selectedMedia.some((item) => item.type.toLowerCase().startsWith('video'));
  const mediaLimit = mode === 'post' ? 4 : 6;
  const canSubmitPost = headline.trim().length > 0 && body.trim().length > 0;
  const canSubmitListing =
    productName.trim().length > 0 &&
    productDescription.trim().length > 0 &&
    productPrice.trim().length > 0 &&
    productStock.trim().length > 0;
  const canSubmit = mode === 'post' ? canSubmitPost : canSubmitListing;
  const publishLabel =
    submissionStage === 'preparing'
      ? 'Preparing...'
      : submissionStage === 'uploading'
        ? 'Uploading media...'
        : submissionStage === 'publishing'
          ? 'Publishing...'
          : 'Publish';
  const stageCopy =
    submissionStage === 'uploading'
      ? `Uploading ${selectedMedia.length} file${selectedMedia.length === 1 ? '' : 's'} to FarmConnect.`
      : submissionStage === 'publishing'
        ? 'Finalizing your post and syncing it to the feed.'
        : selectedMedia.length
          ? `${selectedMedia.length}/${mediaLimit} selected${hasVideo ? ' - includes video' : ''}`
          : `Add up to ${mediaLimit} photos or videos.`;

  const loadMyListings = useCallback(async () => {
    if (!token || !isSeller) {
      setAvailableListings([]);
      return;
    }

    try {
      const response = await api.getProfile(token);
      setAvailableListings(response.listings);
    } catch (error) {
      console.warn('Failed to load listings for post tagging.', error);
    }
  }, [isSeller, token]);

  useEffect(() => {
    if (mode === 'post') {
      void loadMyListings();
      return;
    }

    setLinkedProductId('');
  }, [loadMyListings, mode]);

  async function pickMedia(options?: { cropSingleImage?: boolean }) {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo access so FarmConnect can upload media.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: options?.cropSingleImage ? ['images'] : ['images', 'videos'],
      allowsEditing: Boolean(options?.cropSingleImage),
      aspect: options?.cropSingleImage ? [4, 5] : undefined,
      allowsMultipleSelection: !options?.cropSingleImage,
      quality: 0.9,
      selectionLimit: options?.cropSingleImage ? 1 : mode === 'post' ? 4 : 6,
    });

    if (result.canceled) {
      return;
    }

    const nextAssets = result.assets.map((asset, index) => ({
      uri: asset.uri,
      type: asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg'),
      name: asset.fileName || `farmconnect-media-${Date.now()}-${index}`,
    }));

    setSelectedMedia(options?.cropSingleImage ? nextAssets : nextAssets.slice(0, mediaLimit));
  }

  function removeMedia(indexToRemove: number) {
    setSelectedMedia((current) => current.filter((_, index) => index !== indexToRemove));
  }

  function handleBodySelectionChange(event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) {
    setBodySelection(event.nativeEvent.selection);
  }

  function insertMediaMarker(mediaIndex: number) {
    const marker = `\n\n[[media:${mediaIndex + 1}]]\n\n`;
    const nextBody = `${body.slice(0, bodySelection.start)}${marker}${body.slice(bodySelection.end)}`;
    const nextCursor = bodySelection.start + marker.length;

    setBody(nextBody);
    setBodySelection({ start: nextCursor, end: nextCursor });
  }

  function handleModeChange(nextMode: ComposerMode) {
    setMode(nextMode);
  }

  async function handleSubmit() {
    if (!token) {
      Alert.alert('Sign in required', 'Please sign in before creating posts or listings.');
      return;
    }

    if (mode === 'listing' && !isSeller) {
      Alert.alert('Seller access only', 'Only farmer accounts can create marketplace listings right now.');
      return;
    }

    setIsSubmitting(true);
    setSubmissionStage('preparing');

    try {
      if (mode === 'post') {
        setSubmissionStage(selectedMedia.length ? 'uploading' : 'publishing');
        await api.createFeedPost(token, {
          headline,
          body,
          tag,
          location,
          linkedProductId,
          media: selectedMedia,
        });
      } else {
        setSubmissionStage(selectedMedia.length ? 'uploading' : 'publishing');
        await api.createProduct(token, {
          name: productName,
          category: productCategory,
          description: productDescription,
          unit: productUnit,
          price: productPrice,
          stock: productStock,
          location: productLocation,
          isOrganic,
          media: selectedMedia,
        });
      }

      setSubmissionStage('publishing');
      router.back();
    } catch (error) {
      Alert.alert('Upload failed', error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
      setSubmissionStage('idle');
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={[styles.iconButton, { backgroundColor: palette.surfaceRaised }]}>
            <Feather name="x" size={20} color={palette.text} />
          </Pressable>
          <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
          <Pressable
            onPress={handleSubmit}
            disabled={isSubmitting || !canSubmit}
            style={[
              styles.publishButton,
              { backgroundColor: isSubmitting || canSubmit ? palette.tint : palette.surfaceRaised },
            ]}>
            <Text style={[styles.publishButtonText, { color: isSubmitting || canSubmit ? '#ffffff' : palette.muted }]}>
              {publishLabel}
            </Text>
          </Pressable>
        </View>

        <View style={[styles.modeTabs, { backgroundColor: palette.surface }]}>
          <Pressable
            onPress={() => void handleModeChange('post')}
            style={[styles.modeTab, { backgroundColor: mode === 'post' ? palette.surfaceRaised : 'transparent' }]}>
            <Text style={[styles.modeTabText, { color: palette.text }]}>Post</Text>
          </Pressable>
          <Pressable
            onPress={() => void handleModeChange('listing')}
            style={[styles.modeTab, { backgroundColor: mode === 'listing' ? palette.surfaceRaised : 'transparent' }]}>
            <Text style={[styles.modeTabText, { color: palette.text }]}>Listing</Text>
          </Pressable>
        </View>

        <View style={[styles.mediaCard, { backgroundColor: palette.surfaceRaised }]}>
          <View style={styles.mediaHeader}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Media</Text>
            <View style={styles.mediaActions}>
              <Pressable onPress={() => void pickMedia()} style={[styles.mediaButton, { backgroundColor: palette.surface }]}>
                <Feather name="image" size={16} color={palette.text} />
                <Text style={[styles.mediaButtonText, { color: palette.text }]}>Add set</Text>
              </Pressable>
              <Pressable
                onPress={() => void pickMedia({ cropSingleImage: true })}
                style={[styles.mediaButton, { backgroundColor: palette.surface }]}>
                <Feather name="crop" size={16} color={palette.text} />
                <Text style={[styles.mediaButtonText, { color: palette.text }]}>Crop photo</Text>
              </Pressable>
            </View>
          </View>

          {selectedMedia.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaPreviewRow}>
              {selectedMedia.map((item, index) => (
                <View key={`${item.uri}-${index}`} style={styles.mediaPreviewItem}>
                  <Image source={{ uri: item.uri }} contentFit="cover" style={styles.mediaPreviewImage} />
                  {mode === 'post' ? (
                    <Pressable
                      onPress={() => insertMediaMarker(index)}
                      style={[styles.insertMediaButton, { backgroundColor: 'rgba(0,0,0,0.62)' }]}>
                      <Text style={styles.insertMediaText}>Place {index + 1}</Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    onPress={() => removeMedia(index)}
                    style={[styles.removeMediaButton, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
                    <Feather name="x" size={14} color="#ffffff" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={[styles.helperText, { color: palette.muted }]}>{stageCopy}</Text>
          )}

          {selectedMedia.length ? <Text style={[styles.helperText, { color: palette.muted }]}>{stageCopy}</Text> : null}
          <Text style={[styles.helperText, { color: palette.muted }]}>
            Cropping is available for single-photo picks. Multi-select galleries keep the original framing.
          </Text>
        </View>

        {mode === 'post' ? (
          <View style={[styles.formCard, { backgroundColor: palette.surfaceRaised }]}>
            <TextInput
              value={headline}
              onChangeText={setHeadline}
              placeholder="Headline"
              placeholderTextColor={palette.muted}
              style={[styles.titleInput, { color: palette.text, backgroundColor: palette.surface }]}
            />
            <TextInput
              value={body}
              onChangeText={setBody}
              onSelectionChange={handleBodySelectionChange}
              selection={bodySelection}
              placeholder="Share what is happening on the farm, in the market, or in your community..."
              placeholderTextColor={palette.muted}
              multiline
              style={[styles.bodyInput, { color: palette.text, backgroundColor: palette.surface }]}
            />
            {selectedMedia.length ? (
              <Text style={[styles.helperText, { color: palette.muted }]}>
                Tap Place 1, Place 2, and so on to insert selected media between paragraphs. The marker can be moved like normal text.
              </Text>
            ) : null}
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="Location"
              placeholderTextColor={palette.muted}
              style={[styles.compactInput, { color: palette.text, backgroundColor: palette.surface }]}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {postTags.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setTag(item)}
                  style={[styles.chip, { backgroundColor: tag === item ? `${palette.tint}14` : palette.surface }]}>
                  <Text style={[styles.chipText, { color: tag === item ? palette.tint : palette.text }]}>{item}</Text>
                </Pressable>
              ))}
            </ScrollView>
            {isSeller && availableListings.length ? (
              <View style={styles.linkedListingSection}>
                <Text style={[styles.linkedListingTitle, { color: palette.text }]}>Tag one of your listings</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  <Pressable
                    onPress={() => setLinkedProductId('')}
                    style={[styles.chip, { backgroundColor: !linkedProductId ? `${palette.tint}14` : palette.surface }]}>
                    <Text style={[styles.chipText, { color: !linkedProductId ? palette.tint : palette.text }]}>None</Text>
                  </Pressable>
                  {availableListings.map((listing) => (
                    <Pressable
                      key={listing._id}
                      onPress={() => setLinkedProductId((current) => (current === listing._id ? '' : listing._id))}
                      style={[
                        styles.chip,
                        { backgroundColor: linkedProductId === listing._id ? `${palette.tint}14` : palette.surface },
                      ]}>
                      <Text style={[styles.chipText, { color: linkedProductId === listing._id ? palette.tint : palette.text }]}>
                        {listing.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <Text style={[styles.helperText, { color: palette.muted }]}>
                  Tagged listings show up beneath the post and open directly in Marketplace.
                </Text>
              </View>
            ) : null}
            {!canSubmitPost ? (
              <Text style={[styles.validationText, { color: palette.muted }]}>
                A feed post needs both a headline and some context in the body.
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={[styles.formCard, { backgroundColor: palette.surfaceRaised }]}>
            {!isSeller ? (
              <Text style={[styles.helperText, { color: palette.accent }]}>
                Only farmer accounts can publish listings. You can still use this composer for feed posts.
              </Text>
            ) : null}
            <TextInput
              value={productName}
              onChangeText={setProductName}
              placeholder="Product name"
              placeholderTextColor={palette.muted}
              style={[styles.compactInput, { color: palette.text, backgroundColor: palette.surface }]}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {listingCategories.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setProductCategory(item)}
                  style={[
                    styles.chip,
                    { backgroundColor: productCategory === item ? `${palette.tint}14` : palette.surface },
                  ]}>
                  <Text style={[styles.chipText, { color: productCategory === item ? palette.tint : palette.text }]}>
                    {item}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <TextInput
              value={productDescription}
              onChangeText={setProductDescription}
              placeholder="Describe quality, packaging, timing, and anything buyers should know..."
              placeholderTextColor={palette.muted}
              multiline
              style={[styles.bodyInput, { color: palette.text, backgroundColor: palette.surface }]}
            />
            <View style={styles.dualRow}>
              <TextInput
                value={productPrice}
                onChangeText={setProductPrice}
                placeholder="Price"
                keyboardType="numeric"
                placeholderTextColor={palette.muted}
                style={[styles.halfInput, { color: palette.text, backgroundColor: palette.surface }]}
              />
              <TextInput
                value={productStock}
                onChangeText={setProductStock}
                placeholder="Stock"
                keyboardType="numeric"
                placeholderTextColor={palette.muted}
                style={[styles.halfInput, { color: palette.text, backgroundColor: palette.surface }]}
              />
            </View>
            <View style={styles.dualRow}>
              <TextInput
                value={productUnit}
                onChangeText={setProductUnit}
                placeholder="Unit"
                placeholderTextColor={palette.muted}
                style={[styles.halfInput, { color: palette.text, backgroundColor: palette.surface }]}
              />
              <TextInput
                value={productLocation}
                onChangeText={setProductLocation}
                placeholder="Location"
                placeholderTextColor={palette.muted}
                style={[styles.halfInput, { color: palette.text, backgroundColor: palette.surface }]}
              />
            </View>
            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: palette.text }]}>Organic produce</Text>
              <Switch value={isOrganic} onValueChange={setIsOrganic} trackColor={{ true: `${palette.tint}55` }} />
            </View>
            {!canSubmitListing ? (
              <Text style={[styles.validationText, { color: palette.muted }]}>
                Listings need a name, description, price, and stock before publishing.
              </Text>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 28 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  iconButton: { width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontFamily: Fonts.rounded, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  publishButton: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  publishButtonText: { color: '#ffffff', fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '700' },
  modeTabs: { borderRadius: 999, padding: 4, flexDirection: 'row', gap: 6 },
  modeTab: { flex: 1, borderRadius: 999, alignItems: 'center', paddingVertical: 11 },
  modeTabText: { fontFamily: Fonts.rounded, fontSize: 13, fontWeight: '700' },
  mediaCard: { borderRadius: 24, padding: 14, gap: 12 },
  mediaHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, alignItems: 'center' },
  mediaActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1 },
  sectionTitle: { fontFamily: Fonts.rounded, fontSize: 16, fontWeight: '700' },
  mediaButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  mediaButtonText: { fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '700' },
  mediaPreviewRow: { gap: 10 },
  mediaPreviewItem: { width: 100, height: 124, borderRadius: 18, overflow: 'hidden' },
  mediaPreviewImage: { width: '100%', height: '100%' },
  insertMediaButton: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  insertMediaText: { color: '#ffffff', fontFamily: Fonts.rounded, fontSize: 10, fontWeight: '700' },
  removeMediaButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperText: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19 },
  linkedListingSection: { gap: 8 },
  linkedListingTitle: { fontFamily: Fonts.rounded, fontSize: 14, fontWeight: '700' },
  formCard: { borderRadius: 24, padding: 14, gap: 12 },
  titleInput: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontFamily: Fonts.rounded,
    fontSize: 16,
    fontWeight: '700',
  },
  bodyInput: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 120,
    textAlignVertical: 'top',
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  compactInput: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 13, fontFamily: Fonts.sans, fontSize: 14 },
  chipRow: { gap: 8 },
  chip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9 },
  chipText: { fontFamily: Fonts.rounded, fontSize: 12, fontWeight: '700' },
  dualRow: { flexDirection: 'row', gap: 10 },
  halfInput: { flex: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 13, fontFamily: Fonts.sans, fontSize: 14 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  switchLabel: { fontFamily: Fonts.rounded, fontSize: 14, fontWeight: '700' },
  validationText: { fontFamily: Fonts.sans, fontSize: 12, lineHeight: 18 },
});
