import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSession } from '@/providers/session-provider';

const features = [
  {
    icon: 'home',
    title: 'Farm feed',
    body: 'Share field updates, market signals, photos, and short videos.',
    accent: 'tint',
  },
  {
    icon: 'shopping-bag',
    title: 'Marketplace',
    body: 'Find produce, compare sellers, and trade with more context.',
    accent: 'accent',
  },
  {
    icon: 'message-circle',
    title: 'Community',
    body: 'Ask questions, join discussions, and learn from real experience.',
    accent: 'accentSecondary',
  },
  {
    icon: 'shield',
    title: 'Trust profiles',
    body: 'Build reputation through activity, listings, followers, and reviews.',
    accent: 'success',
  },
] as const;

export default function GetStartedScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { width } = useWindowDimensions();
  const { markIntroSeen } = useSession();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const cardWidth = Math.min(width - 70, 330);
  const sideInset = Math.max(22, (width - cardWidth) / 2);

  function handleGetStarted() {
    markIntroSeen();
    router.replace('/auth?mode=login');
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <View style={styles.screen}>
        <View style={styles.brandBlock}>
          <View style={[styles.brandMark, { backgroundColor: palette.backgroundSecondary }]}>
            <Feather name="sunrise" size={22} color={palette.tint} />
          </View>
          <Text style={[styles.brand, { color: palette.tint }]}>FarmConnect</Text>
          <Text style={[styles.title, { color: palette.text }]}>Fresh. Local. Connected.</Text>
        </View>

        <View style={styles.carouselWrap}>
          <Animated.ScrollView
            horizontal
            pagingEnabled={false}
            decelerationRate="fast"
            snapToInterval={cardWidth + 14}
            snapToAlignment="start"
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: sideInset, gap: 14 }}
            onMomentumScrollEnd={(event) => {
              const nextIndex = Math.round(event.nativeEvent.contentOffset.x / (cardWidth + 14));
              setActiveIndex(Math.max(0, Math.min(features.length - 1, nextIndex)));
            }}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
              useNativeDriver: true,
            })}
            scrollEventThrottle={16}>
            {features.map((feature, index) => {
              const inputRange = [
                (index - 1) * (cardWidth + 14),
                index * (cardWidth + 14),
                (index + 1) * (cardWidth + 14),
              ];
              const scale = scrollX.interpolate({
                inputRange,
                outputRange: [0.92, 1, 0.92],
                extrapolate: 'clamp',
              });
              const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.68, 1, 0.68],
                extrapolate: 'clamp',
              });
              const accentColor = palette[feature.accent];

              return (
                <Animated.View
                  key={feature.title}
                  style={[
                    styles.featureCard,
                    {
                      width: cardWidth,
                      backgroundColor: scheme === 'dark' ? `${palette.surfaceRaised}EE` : `${palette.surfaceRaised}F2`,
                      opacity,
                      transform: [{ scale }],
                    },
                  ]}>
                  <View style={[styles.cardGlow, { backgroundColor: `${accentColor}22` }]} />
                  <View style={[styles.featureIcon, { backgroundColor: `${accentColor}18` }]}>
                    <Feather name={feature.icon} size={24} color={accentColor} />
                  </View>
                  <Text style={[styles.featureTitle, { color: palette.text }]}>{feature.title}</Text>
                  <Text style={[styles.featureBody, { color: palette.muted }]}>{feature.body}</Text>
                </Animated.View>
              );
            })}
          </Animated.ScrollView>

          <View style={styles.dots}>
            {features.map((feature, index) => (
              <View
                key={feature.title}
                style={[
                  styles.dot,
                  {
                    width: activeIndex === index ? 24 : 7,
                    backgroundColor: activeIndex === index ? palette.tint : palette.border,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        <Pressable onPress={handleGetStarted} style={[styles.primaryButton, { backgroundColor: palette.tint }]}>
          <Text style={styles.primaryButtonText}>Get started</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  screen: { flex: 1, paddingVertical: 22, justifyContent: 'center', gap: 28 },
  brandBlock: { alignItems: 'center', gap: 8, paddingHorizontal: 24 },
  brandMark: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  brand: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  title: { fontFamily: Fonts.rounded, fontSize: 31, fontWeight: '800', lineHeight: 37, textAlign: 'center' },
  carouselWrap: { gap: 14 },
  featureCard: {
    minHeight: 280,
    borderRadius: 30,
    padding: 22,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.42)',
  },
  cardGlow: { position: 'absolute', width: 190, height: 190, borderRadius: 999, right: -46, top: -58 },
  featureIcon: { width: 58, height: 58, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  featureTitle: { fontFamily: Fonts.rounded, fontSize: 26, fontWeight: '800', lineHeight: 31 },
  featureBody: { fontFamily: Fonts.sans, fontSize: 15, lineHeight: 22, marginTop: 8 },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7 },
  dot: { height: 7, borderRadius: 999 },
  primaryButton: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
    minHeight: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#FFFFFF', fontFamily: Fonts.rounded, fontSize: 15, fontWeight: '800' },
});
