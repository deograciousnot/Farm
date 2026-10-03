import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { memo, useEffect, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { FeedPost } from '@/lib/types';
import { usePreferences } from '@/providers/preferences-provider';

type MediaItem = NonNullable<FeedPost['media']>[number];

type FeedMediaProps = {
  media: MediaItem[];
  /** "feed" shows posters and opens the post on tap; "detail" plays video inline. */
  mode?: 'feed' | 'detail';
  onOpen?: () => void;
};

export const FeedMedia = memo(function FeedMedia({ media, mode = 'feed', onOpen }: FeedMediaProps) {
  const { colors } = useTheme();
  const { dataSaver } = usePreferences();
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  if (!media.length) {
    return null;
  }

  const aspectRatio = mode === 'feed' ? 4 / 3 : 4 / 5;
  const hideUntilTapped = mode === 'feed' && dataSaver && !revealed;

  if (hideUntilTapped) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Load media"
        onPress={() => setRevealed(true)}
        style={[styles.shell, styles.saverTile, { backgroundColor: colors.surfaceMuted }]}>
        <Feather name={media[0].type === 'video' ? 'film' : 'image'} size={20} color={colors.textMuted} />
        <AppText variant="label" color="textMuted">
          {media.length > 1 ? `${media.length} items` : media[0].type === 'video' ? 'Video' : 'Photo'} · tap to load
        </AppText>
        <AppText variant="caption" color="textSubtle">
          Data saver is on
        </AppText>
      </Pressable>
    );
  }

  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={[styles.shell, { aspectRatio, backgroundColor: colors.surfaceMuted }]}>
      {width > 0 ? (
        <ScrollView
          horizontal
          pagingEnabled
          scrollEnabled={media.length > 1}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => setActiveIndex(Math.round(event.nativeEvent.contentOffset.x / width))}>
          {media.map((item, index) => (
            <View key={`${item.url}-${index}`} style={{ width, height: '100%' }}>
              {item.type === 'video' && mode === 'detail' ? (
                <InlineVideo url={item.url} autoplay={!dataSaver && index === activeIndex} />
              ) : (
                <Pressable onPress={onOpen} disabled={!onOpen} style={styles.fill}>
                  <Image
                    source={{ uri: item.type === 'video' ? item.thumbnailUrl : item.url }}
                    contentFit="cover"
                    transition={150}
                    style={styles.fill}
                  />
                  {item.type === 'video' ? (
                    <View style={[styles.playBadge, { backgroundColor: colors.mediaOverlay }]}>
                      <Feather name="play" size={22} color={colors.onMedia} />
                    </View>
                  ) : null}
                </Pressable>
              )}
            </View>
          ))}
        </ScrollView>
      ) : null}

      {media.length > 1 ? (
        <View style={[styles.counter, { backgroundColor: colors.mediaOverlay }]}>
          <AppText variant="caption" style={{ color: colors.onMedia }}>
            {activeIndex + 1}/{media.length}
          </AppText>
        </View>
      ) : null}
    </View>
  );
});

function InlineVideo({ url, autoplay }: { url: string; autoplay: boolean }) {
  const player = useVideoPlayer(url, (instance) => {
    instance.loop = true;
    instance.staysActiveInBackground = false;
    instance.showNowPlayingNotification = false;
  });

  useEffect(() => {
    if (autoplay) {
      player.play();
    } else {
      player.pause();
    }
  }, [autoplay, player]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        player.pause();
      }
    });

    return () => subscription.remove();
  }, [player]);

  return (
    <VideoView
      player={player}
      style={[styles.fill, styles.video]}
      contentFit="contain"
      nativeControls
      allowsPictureInPicture={false}
      fullscreenOptions={{ enable: true }}
    />
  );
}

const styles = StyleSheet.create({
  shell: { width: '100%', borderRadius: Radius.lg, overflow: 'hidden' },
  saverTile: { minHeight: 120, alignItems: 'center', justifyContent: 'center', gap: Spacing.xxs, padding: Spacing.md },
  fill: { width: '100%', height: '100%' },
  video: { backgroundColor: '#000' },
  playBadge: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    marginTop: -28,
    width: 56,
    height: 56,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 3,
  },
});
