import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { UploadableAsset } from '@/lib/types';

const MAX_FILE_MB = 40;

type MediaPickerProps = {
  value: UploadableAsset[];
  onChange: (assets: UploadableAsset[]) => void;
  limit: number;
  allowVideo?: boolean;
  /** Optional per-item action, e.g. placing an image inside the post text. */
  itemAction?: { label: (index: number) => string; onPress: (index: number) => void };
};

/** Horizontal strip of picked photos/videos with an "add" tile. */
export function MediaPicker({ value, onChange, limit, allowVideo = false, itemAction }: MediaPickerProps) {
  const { colors } = useTheme();
  const remaining = limit - value.length;

  async function pick() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Allow FarmConnect to use your photos in your phone settings to attach them.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: allowVideo ? ['images', 'videos'] : ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });

    if (result.canceled) {
      return;
    }

    const oversized = result.assets.some((asset) => asset.fileSize && asset.fileSize > MAX_FILE_MB * 1024 * 1024);

    if (oversized) {
      Alert.alert('File too large', `Each photo or video must be ${MAX_FILE_MB} MB or smaller. Try a shorter video.`);
      return;
    }

    const picked = result.assets.map((asset, index) => ({
      uri: asset.uri,
      type: asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg'),
      name: asset.fileName || `farmconnect-${Date.now()}-${index}`,
      fileSize: asset.fileSize,
    }));

    onChange([...value, ...picked].slice(0, limit));
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {remaining > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add photos"
          onPress={() => void pick()}
          style={[styles.tile, styles.addTile, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Feather name="camera" size={22} color={colors.primary} />
          <AppText variant="caption" color="textMuted" align="center">
            {value.length ? `Add (${remaining} left)` : allowVideo ? 'Photos or video' : 'Add photos'}
          </AppText>
        </Pressable>
      ) : null}
      {value.map((asset, index) => (
        <View key={`${asset.uri}-${index}`} style={styles.tile}>
          <Image source={{ uri: asset.uri }} contentFit="cover" style={StyleSheet.absoluteFill} />
          {asset.type.startsWith('video') ? (
            <View style={[styles.videoTag, { backgroundColor: colors.mediaOverlay }]}>
              <Feather name="video" size={12} color={colors.onMedia} />
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Remove"
            onPress={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}
            hitSlop={6}
            style={[styles.remove, { backgroundColor: colors.mediaOverlay }]}>
            <Feather name="x" size={14} color={colors.onMedia} />
          </Pressable>
          {itemAction ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => itemAction.onPress(index)}
              style={[styles.itemAction, { backgroundColor: colors.mediaOverlay }]}>
              <AppText variant="caption" style={{ color: colors.onMedia }}>
                {itemAction.label(index)}
              </AppText>
            </Pressable>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: Spacing.xs },
  tile: { width: 96, height: 96, borderRadius: Radius.md, overflow: 'hidden' },
  addTile: { borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4, padding: Spacing.xs },
  videoTag: { position: 'absolute', left: 6, top: 6, borderRadius: Radius.pill, padding: 4 },
  remove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemAction: { position: 'absolute', left: 6, right: 6, bottom: 6, borderRadius: Radius.pill, paddingVertical: 3, alignItems: 'center' },
});
