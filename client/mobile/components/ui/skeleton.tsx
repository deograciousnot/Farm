import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SkeletonProps = {
  width?: DimensionValue;
  height?: number;
  radius?: number;
};

export function Skeleton({ width = '100%', height = 14, radius = Radius.sm }: SkeletonProps) {
  const { colors } = useTheme();
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.45, { duration: 750 }), -1, true);
    return () => cancelAnimation(opacity);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: colors.skeleton }, animatedStyle]} />;
}

/** Placeholder shaped like a post or thread card while a list loads. */
export function CardSkeleton({ withMedia = false }: { withMedia?: boolean }) {
  return (
    <View style={styles.card} accessibilityLabel="Loading">
      <View style={styles.row}>
        <Skeleton width={40} height={40} radius={Radius.pill} />
        <View style={styles.lines}>
          <Skeleton width="45%" height={12} />
          <Skeleton width="30%" height={10} />
        </View>
      </View>
      <Skeleton width="85%" height={18} />
      <Skeleton height={12} />
      <Skeleton width="70%" height={12} />
      {withMedia ? <Skeleton height={180} radius={Radius.lg} /> : null}
    </View>
  );
}

export function ListSkeleton({ count = 3, withMedia = false }: { count?: number; withMedia?: boolean }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }, (_, index) => (
        <CardSkeleton key={index} withMedia={withMedia && index === 0} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.xl },
  card: { gap: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  lines: { flex: 1, gap: 6 },
});
