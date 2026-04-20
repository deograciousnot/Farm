import { useEventListener } from 'expo';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { FeedPost } from '@/lib/types';

type FeedMediaProps = {
  media: NonNullable<FeedPost['media']>;
  onToggleLike?: () => void;
  onOpenPost?: () => void;
  mode?: 'feed' | 'detail';
  allowPlayback?: boolean;
  playbackPositions?: Record<string, number>;
  onPlaybackTimeChange?: (mediaUrl: string, currentTime: number) => void;
};

export const FeedMedia = memo(function FeedMedia({
  media,
  onToggleLike,
  onOpenPost,
  mode = 'feed',
  allowPlayback = true,
  playbackPositions,
  onPlaybackTimeChange,
}: FeedMediaProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const cardWidth = useMemo(() => Math.max(220, width - (mode === 'detail' ? 36 : 28)), [mode, width]);
  const activeItem = media[activeIndex] ?? media[0];
  if (!activeItem) {
    return null;
  }

  function handleScroll(event: { nativeEvent: { contentOffset: { x: number } } }) {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / cardWidth);
    setActiveIndex(Math.max(0, Math.min(media.length - 1, nextIndex)));
  }

  return (
    <View
      style={[
        styles.shell,
        styles[activeItem.type === 'video' ? 'videoShell' : 'imageShell'],
        { backgroundColor: palette.backgroundTertiary },
      ]}>
      {media.length > 1 ? (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          onMomentumScrollEnd={handleScroll}>
          {media.map((item, index) => (
            <View key={`${item.url}-${index}`} style={{ width: cardWidth, flex: 1 }}>
              {item.type === 'video' ? (
                <VideoMedia
                  url={item.url}
                  onToggleLike={onToggleLike}
                  mode={mode}
                  allowPlayback={allowPlayback && index === activeIndex}
                  initialPlaybackTime={playbackPositions?.[item.url] ?? 0}
                  onPlaybackTimeChange={onPlaybackTimeChange}
                />
              ) : (
                <Pressable onPress={onOpenPost} disabled={!onOpenPost} style={styles.mediaTapTarget}>
                  <Image source={{ uri: item.url }} contentFit="cover" style={styles.media} />
                </Pressable>
              )}
            </View>
          ))}
        </ScrollView>
      ) : activeItem.type === 'video' ? (
        <VideoMedia
          url={activeItem.url}
          onToggleLike={onToggleLike}
          mode={mode}
          allowPlayback={allowPlayback}
          initialPlaybackTime={playbackPositions?.[activeItem.url] ?? 0}
          onPlaybackTimeChange={onPlaybackTimeChange}
        />
      ) : (
        <Pressable onPress={onOpenPost} disabled={!onOpenPost} style={styles.mediaTapTarget}>
          <Image source={{ uri: activeItem.url }} contentFit="cover" style={styles.media} />
        </Pressable>
      )}

      {media.length > 1 ? (
        <>
          <View style={[styles.countBadge, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
            <Text style={styles.countBadgeText}>
              {activeIndex + 1}/{media.length}
            </Text>
          </View>
          <View style={styles.pagination}>
            {media.map((item, index) => (
              <View
                key={`${item.url}-dot-${index}`}
                style={[
                  styles.paginationDot,
                  {
                    backgroundColor:
                      index === activeIndex
                        ? '#ffffff'
                        : scheme === 'dark'
                          ? 'rgba(255,255,255,0.38)'
                          : 'rgba(255,255,255,0.7)',
                  },
                ]}
              />
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
});

function VideoMedia({
  url,
  onToggleLike,
  mode,
  allowPlayback,
  initialPlaybackTime,
  onPlaybackTimeChange,
}: {
  url: string;
  onToggleLike?: () => void;
  mode: 'feed' | 'detail';
  allowPlayback: boolean;
  initialPlaybackTime: number;
  onPlaybackTimeChange?: (mediaUrl: string, currentTime: number) => void;
}) {
  const shouldAutoplay = mode === 'detail' || allowPlayback;
  const [isPausedByUser, setIsPausedByUser] = useState(false);
  const [isMuted, setIsMuted] = useState(mode === 'feed');
  const [showHeart, setShowHeart] = useState(false);
  const lastTapRef = useRef<number>(0);
  const heartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasRestoredPositionRef = useRef(false);
  const isPaused = !allowPlayback || isPausedByUser;

  const player = useVideoPlayer(url, (instance) => {
    instance.loop = true;
    instance.muted = mode === 'feed';
    instance.staysActiveInBackground = false;
    instance.showNowPlayingNotification = false;
    instance.timeUpdateEventInterval = 0.25;

    if (shouldAutoplay) {
      instance.play();
    } else {
      instance.pause();
    }
  });

  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    onPlaybackTimeChange?.(url, currentTime);
  });

  useEffect(() => {
    if (hasRestoredPositionRef.current) {
      return;
    }

    if (initialPlaybackTime > 0) {
      player.currentTime = initialPlaybackTime;
    }

    hasRestoredPositionRef.current = true;
  }, [initialPlaybackTime, player]);

  useEffect(() => {
    player.muted = isMuted;

    if (!allowPlayback) {
      onPlaybackTimeChange?.(url, player.currentTime);
      player.pause();
      return;
    }

    if (!isPausedByUser) {
      player.play();
      return;
    }

    onPlaybackTimeChange?.(url, player.currentTime);
    player.pause();
  }, [allowPlayback, isMuted, isPausedByUser, onPlaybackTimeChange, player, url]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        onPlaybackTimeChange?.(url, player.currentTime);
        player.pause();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [onPlaybackTimeChange, player, url]);

  useEffect(() => {
    return () => {
      onPlaybackTimeChange?.(url, player.currentTime);
    };
  }, [onPlaybackTimeChange, player, url]);

  function handlePress() {
    const now = Date.now();

    if (now - lastTapRef.current < 260) {
      lastTapRef.current = 0;
      onToggleLike?.();
      setShowHeart(true);

      if (heartTimeoutRef.current) {
        clearTimeout(heartTimeoutRef.current);
      }

      heartTimeoutRef.current = setTimeout(() => {
        setShowHeart(false);
      }, 700);

      return;
    }

    lastTapRef.current = now;

    setTimeout(() => {
      if (lastTapRef.current !== now) {
        return;
      }

      if (isPausedByUser || !allowPlayback) {
        setIsPausedByUser(false);
        player.play();
      } else {
        onPlaybackTimeChange?.(url, player.currentTime);
        player.pause();
        setIsPausedByUser(true);
      }
    }, 240);
  }

  function handleToggleMute() {
    player.muted = !isMuted;
    setIsMuted((current) => !current);
  }

  return (
    <Pressable onPress={handlePress} style={styles.mediaTapTarget}>
      <VideoView
        player={player}
        style={styles.media}
        contentFit="cover"
        nativeControls={mode === 'detail'}
        allowsPictureInPicture={false}
        fullscreenOptions={{ enable: true }}
      />
      {isPaused ? (
        <View style={[styles.centerOverlay, { backgroundColor: 'rgba(0,0,0,0.22)' }]}>
          <Ionicons name="pause" size={28} color="#ffffff" />
        </View>
      ) : null}
      {showHeart ? (
        <View style={styles.likeOverlay}>
          <Ionicons name="heart" size={54} color="#ffffff" />
        </View>
      ) : null}

      {mode === 'feed' ? (
        <Pressable onPress={handleToggleMute} style={styles.feedMuteButton} hitSlop={8}>
          <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={15} color="#ffffff" />
        </Pressable>
      ) : null}

    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 22,
    overflow: 'hidden',
  },
  imageShell: { aspectRatio: 4 / 5 },
  videoShell: { aspectRatio: 4 / 5 },
  mediaTapTarget: { flex: 1 },
  media: {
    width: '100%',
    height: '100%',
  },
  countBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  countBadgeText: {
    color: '#ffffff',
    fontFamily: Fonts.rounded,
    fontSize: 11,
    fontWeight: '700',
  },
  pagination: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  centerOverlay: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  likeOverlay: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedMuteButton: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
});
