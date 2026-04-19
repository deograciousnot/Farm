import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSession } from '@/providers/session-provider';

export default function LaunchScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { isLoading, token, mode, hasSeenIntro } = useSession();

  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(20)).current;
  const basketLift = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 620,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(rise, {
        toValue: 0,
        duration: 620,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(basketLift, {
            toValue: -6,
            duration: 900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(basketLift, {
            toValue: 0,
            duration: 900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 0.92,
            duration: 1200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  }, [basketLift, fade, pulse, rise]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const timeout = setTimeout(() => {
      if (token || mode === 'guest') {
        router.replace('/(tabs)');
        return;
      }

      if (hasSeenIntro) {
        router.replace('/auth?mode=login');
        return;
      }

      router.replace('/get-started');
    }, 1700);

    return () => clearTimeout(timeout);
  }, [hasSeenIntro, isLoading, mode, token]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <View style={styles.screen}>
        <View style={styles.glowLayer}>
          <View style={[styles.glow, styles.glowTopRight, { backgroundColor: `${palette.accent}22` }]} />
          <View style={[styles.glow, styles.glowBottomLeft, { backgroundColor: `${palette.tint}20` }]} />
          <View style={[styles.glow, styles.glowCenter, { backgroundColor: `${palette.accentSecondary}22` }]} />
        </View>

        <Animated.View
          style={[
            styles.content,
            {
              opacity: fade,
              transform: [{ translateY: rise }],
            },
          ]}>
          <Animated.View style={[styles.illustrationShell, { transform: [{ scale: pulse }] }]}>
            <View style={[styles.sun, { backgroundColor: `${palette.accentSecondary}55` }]} />
            <View style={[styles.hillBack, { backgroundColor: `${palette.tint}2A` }]} />
            <View style={[styles.hillFront, { backgroundColor: `${palette.tint}50` }]} />

            <View style={styles.farmerFigure}>
              <View style={[styles.head, { backgroundColor: '#f2c29a' }]} />
              <View style={[styles.hatBrim, { backgroundColor: palette.accent }]} />
              <View style={[styles.hatTop, { backgroundColor: palette.accentSecondary }]} />
              <View style={[styles.body, { backgroundColor: palette.tint }]} />
              <View style={[styles.apron, { backgroundColor: palette.surfaceRaised }]} />
              <View style={[styles.legLeft, { backgroundColor: '#725548' }]} />
              <View style={[styles.legRight, { backgroundColor: '#725548' }]} />
              <Animated.View
                style={[styles.basket, { backgroundColor: '#b26b36', transform: [{ translateY: basketLift }] }]}>
                <View style={[styles.basketHandle, { borderColor: '#8b4f26' }]} />
                <View style={[styles.produceDot, styles.produceOne, { backgroundColor: palette.accent }]} />
                <View
                  style={[styles.produceDot, styles.produceTwo, { backgroundColor: palette.accentSecondary }]}
                />
                <View style={[styles.produceDot, styles.produceThree, { backgroundColor: palette.tint }]} />
              </Animated.View>
            </View>
          </Animated.View>

          <View style={styles.copyBlock}>
            <Text style={[styles.brand, { color: palette.tint }]}>FarmConnect</Text>
            <Text style={[styles.tagline, { color: palette.text }]}>Fresh. Local. Connected.</Text>
            <Text style={[styles.subline, { color: palette.muted }]}>
              Feed-first farming conversations, community Q&A, and a real marketplace in one colorful home.
            </Text>
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  screen: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, overflow: 'hidden' },
  glowLayer: { ...StyleSheet.absoluteFillObject },
  glow: { position: 'absolute', borderRadius: 999 },
  glowTopRight: { width: 220, height: 220, right: -60, top: 10 },
  glowBottomLeft: { width: 240, height: 240, left: -90, bottom: 30 },
  glowCenter: { width: 150, height: 150, alignSelf: 'center', top: '24%' },
  content: { alignItems: 'center', gap: 28 },
  illustrationShell: { width: 292, height: 320, alignItems: 'center', justifyContent: 'flex-end' },
  sun: { position: 'absolute', width: 84, height: 84, borderRadius: 999, top: 14, right: 42 },
  hillBack: { position: 'absolute', width: 286, height: 120, borderRadius: 120, bottom: 24 },
  hillFront: { position: 'absolute', width: 244, height: 96, borderRadius: 110, bottom: 8 },
  farmerFigure: { width: 170, height: 220, alignItems: 'center', justifyContent: 'flex-end' },
  head: { position: 'absolute', width: 54, height: 54, borderRadius: 999, top: 18 },
  hatBrim: { position: 'absolute', width: 86, height: 12, borderRadius: 999, top: 20 },
  hatTop: { position: 'absolute', width: 48, height: 22, borderRadius: 20, top: 2 },
  body: { position: 'absolute', width: 88, height: 104, borderRadius: 30, top: 58 },
  apron: { position: 'absolute', width: 44, height: 72, borderRadius: 18, top: 82 },
  legLeft: { position: 'absolute', width: 18, height: 68, borderRadius: 18, bottom: 0, left: 54 },
  legRight: { position: 'absolute', width: 18, height: 68, borderRadius: 18, bottom: 0, right: 54 },
  basket: {
    position: 'absolute',
    width: 90,
    height: 54,
    borderRadius: 18,
    right: 8,
    top: 102,
    justifyContent: 'center',
    alignItems: 'center',
  },
  basketHandle: {
    position: 'absolute',
    width: 52,
    height: 34,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
    top: -18,
  },
  produceDot: { position: 'absolute', width: 16, height: 16, borderRadius: 999, top: 14 },
  produceOne: { left: 16 },
  produceTwo: { top: 10 },
  produceThree: { right: 16 },
  copyBlock: { alignItems: 'center', gap: 10, maxWidth: 320 },
  brand: {
    fontFamily: Fonts.rounded,
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  tagline: { fontFamily: Fonts.rounded, fontSize: 34, fontWeight: '700', textAlign: 'center', lineHeight: 40 },
  subline: { fontFamily: Fonts.sans, fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
