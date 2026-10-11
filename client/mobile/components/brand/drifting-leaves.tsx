import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';

// A handful of leaves, each with its own lane, size, pace and starting point (already partway down when the
// screen opens), so the motion never looks mechanical.
const LEAVES = [
  { x: 0.12, size: 22, fall: 19000, start: 0.15, sway: 26, spin: 140, tint: 'primary' },
  { x: 0.34, size: 14, fall: 24000, start: 0.62, sway: 18, spin: -110, tint: 'accent' },
  { x: 0.58, size: 26, fall: 21000, start: 0.38, sway: 30, spin: 160, tint: 'primary' },
  { x: 0.78, size: 16, fall: 26000, start: 0.8, sway: 20, spin: -150, tint: 'primary' },
  { x: 0.9, size: 12, fall: 23000, start: 0.02, sway: 16, spin: 120, tint: 'accent' },
] as const;

function Leaf({ leaf, width, height }: { leaf: (typeof LEAVES)[number]; width: number; height: number }) {
  const { colors } = useTheme();
  const fall = useSharedValue<number>(leaf.start);
  const sway = useSharedValue(0);

  useEffect(() => {
    // Finish the first fall from the starting point, then loop from the top.
    fall.value = withSequence(
      withTiming(1, { duration: leaf.fall * (1 - leaf.start), easing: Easing.linear }),
      withRepeat(withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: leaf.fall, easing: Easing.linear })), -1)
    );
    sway.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
        withTiming(-1, { duration: 2600, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, [fall, sway, leaf]);

  const style = useAnimatedStyle(() => ({
    // Fade in at the top and out near the bottom so leaves never pop in or out.
    opacity: 0.22 * (fall.value < 0.08 ? fall.value / 0.08 : fall.value > 0.85 ? (1 - fall.value) / 0.15 : 1),
    transform: [
      { translateY: -40 + fall.value * (height + 80) },
      { translateX: sway.value * leaf.sway },
      { rotate: `${fall.value * leaf.spin + sway.value * 12}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.leaf,
        {
          left: leaf.x * width,
          width: leaf.size,
          height: leaf.size,
          borderTopLeftRadius: leaf.size,
          borderBottomRightRadius: leaf.size,
          backgroundColor: leaf.tint === 'accent' ? colors.accent : colors.primary,
        },
        style,
      ]}
    />
  );
}

/** Slow leaves drifting down behind a screen's content. Decorative: hidden from screen readers, off with reduced motion. */
export function DriftingLeaves() {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {LEAVES.map((leaf, index) => (
        <Leaf key={index} leaf={leaf} width={width} height={height} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  leaf: { position: 'absolute', top: 0, opacity: 0 },
});
