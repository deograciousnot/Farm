import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type AvatarProps = {
  name: string;
  imageUrl?: string;
  size?: number;
};

export function Avatar({ name, imageUrl, size = 40 }: AvatarProps) {
  const { colors } = useTheme();
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
  const shape = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View style={[styles.shell, shape, { backgroundColor: colors.primarySoft }]}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={shape} contentFit="cover" transition={150} />
      ) : (
        <Text style={[styles.initials, { color: colors.primary, fontSize: Math.max(12, size * 0.36) }]}>{initials}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  initials: { fontFamily: FontFamily.bold },
});
