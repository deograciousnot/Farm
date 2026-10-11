import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';

// Matches the native splash: the mark at `imageWidth` (app.json), centred on the app background.
const SIZE = 160;
// Where the seed sits in the 1024px artwork (see assets/brand), as fractions of the mark's box.
const SEED = { x: 492 / 1024, y: 790 / 1024, r: 54 / 1024 };
const SEED_COLOR = '#E0A526';
const breeze = Easing.inOut(Easing.sin);

/**
 * Takes over from the native splash and hands off to the app: the sprout sways once in a breeze,
 * the seed sends out a soft ripple, then the mark drifts up as the screen fades away (~1.5s).
 * With reduced motion it simply fades.
 */
export function AnimatedSplash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const { scheme, colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const sway = useSharedValue(0);
  const ripple = useSharedValue(0);
  const exit = useSharedValue(0);

  useEffect(() => {
    if (!ready) return;

    const finish = (finished?: boolean) => {
      'worklet';
      if (finished) runOnJS(onDone)();
    };

    if (reduceMotion) {
      exit.value = withTiming(1, { duration: 250 }, finish);
      return;
    }

    sway.value = withSequence(
      withTiming(-5, { duration: 420, easing: breeze }),
      withTiming(3.5, { duration: 480, easing: breeze }),
      withTiming(0, { duration: 420, easing: breeze })
    );
    ripple.value = withDelay(180, withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }));
    exit.value = withDelay(900, withTiming(1, { duration: 600, easing: Easing.inOut(Easing.cubic) }, finish));
  }, [ready, reduceMotion, onDone, sway, ripple, exit]);

  const screenStyle = useAnimatedStyle(() => ({ opacity: 1 - exit.value }));
  const markStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -18 * exit.value }, { scale: 1 + 0.06 * exit.value }],
  }));
  const sproutStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${sway.value}deg` }] }));
  const rippleStyle = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - ripple.value),
    transform: [{ scale: 1 + ripple.value * 5 }],
  }));

  const seedSize = SEED.r * 2 * SIZE;
  const seedPosition = { left: SEED.x * SIZE - seedSize / 2, top: SEED.y * SIZE - seedSize / 2, width: seedSize, height: seedSize };

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.screen, { backgroundColor: colors.background }, screenStyle]}>
      <Animated.View style={[styles.mark, markStyle]}>
        <Animated.View style={[styles.ripple, seedPosition, { borderColor: SEED_COLOR }, rippleStyle]} />
        {/* Pivot at the base of the stem, so it sways like a plant rather than spinning. */}
        <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: `${SEED.x * 100}% ${SEED.y * 100}%` }, sproutStyle]}>
          <Image
            source={
              scheme === 'dark'
                ? require('@/assets/images/farmconnect-splash-sprout-dark.png')
                : require('@/assets/images/farmconnect-splash-sprout.png')
            }
            style={StyleSheet.absoluteFill}
            contentFit="contain"
          />
        </Animated.View>
        <View style={[styles.seed, seedPosition]} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  mark: { width: SIZE, height: SIZE },
  seed: { position: 'absolute', borderRadius: 999, backgroundColor: SEED_COLOR },
  ripple: { position: 'absolute', borderRadius: 999, borderWidth: 2 },
});
