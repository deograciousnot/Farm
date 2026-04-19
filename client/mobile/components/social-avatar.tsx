import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type SocialAvatarProps = {
  name: string;
  imageUrl?: string;
  size?: number;
};

export function SocialAvatar({ name, imageUrl, size = 44 }: SocialAvatarProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <View
      style={[
        styles.shell,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: `${palette.accentSecondary}28`,
          borderColor: `${palette.surfaceRaised}cc`,
        },
      ]}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" />
      ) : (
        <Text style={[styles.initials, { color: palette.accent, fontSize: Math.max(12, size * 0.34) }]}>{initials}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    overflow: 'hidden',
  },
  initials: {
    fontFamily: Fonts.rounded,
    fontWeight: '700',
  },
});
