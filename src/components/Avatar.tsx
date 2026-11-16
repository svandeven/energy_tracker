import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../theme';
import { Text } from './Text';

/** The profile picture, or the name's initials, or a person glyph. */
export function Avatar({
  url,
  name,
  size = 42,
}: {
  url?: string | null;
  name?: string | null;
  size?: number;
}) {
  const box = { width: size, height: size, borderRadius: size / 2 };
  if (url) {
    return (
      <Image source={{ uri: url }} style={[styles.base, box]} contentFit="cover" transition={150} />
    );
  }
  const initials = (name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  return (
    <View style={[styles.base, styles.fallback, box]}>
      {initials ? (
        <Text
          variant="bodyStrong"
          color={colors.onTint}
          style={{ fontSize: size * 0.38, lineHeight: size * 0.46 }}
        >
          {initials}
        </Text>
      ) : (
        <Ionicons name="person" size={size * 0.48} color={colors.onTint} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden' },
  fallback: { backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
});
