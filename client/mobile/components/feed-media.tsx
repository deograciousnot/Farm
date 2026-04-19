import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { FeedPost } from '@/lib/types';

type FeedMediaProps = {
  media: NonNullable<FeedPost['media']>;
};

export function FeedMedia({ media }: FeedMediaProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const primaryItem = media[0];

  if (!primaryItem) {
    return null;
  }

  return (
    <View
      style={[
        styles.shell,
        styles[primaryItem.type === 'video' ? 'videoShell' : 'imageShell'],
        { backgroundColor: palette.backgroundTertiary },
      ]}>
      {primaryItem.type === 'video' ? (
        <VideoMedia url={primaryItem.url} />
      ) : (
        <Image source={{ uri: primaryItem.url }} contentFit="cover" style={styles.media} />
      )}

      <View
        style={[
          styles.badge,
          {
            backgroundColor: scheme === 'dark' ? 'rgba(13, 20, 17, 0.72)' : 'rgba(255, 255, 255, 0.86)',
          },
        ]}>
        <Text style={[styles.badgeText, { color: palette.text }]}>
          {primaryItem.type === 'video' ? 'Video update' : 'Photo update'}
        </Text>
      </View>
    </View>
  );
}

function VideoMedia({ url }: { url: string }) {
  const player = useVideoPlayer(url, (instance) => {
    instance.loop = true;
    instance.muted = true;
    instance.play();
  });

  return (
    <VideoView
      player={player}
      style={styles.media}
      contentFit="cover"
      nativeControls={false}
      allowsPictureInPicture={false}
      fullscreenOptions={{ enable: true }}
    />
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  imageShell: { aspectRatio: 4 / 5 },
  videoShell: { aspectRatio: 16 / 9 },
  media: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: 12,
    left: 12,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontFamily: Fonts.rounded,
    fontSize: 11,
    fontWeight: '700',
  },
});
