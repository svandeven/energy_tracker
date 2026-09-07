import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, radii } from '../theme';

/** Maps a question's stored `icon` key to a glyph. Unknown keys fall back to the sun. */
const GLYPHS: Record<string, React.ComponentProps<typeof MaterialCommunityIcons>['name']> = {
  sun: 'white-balance-sunny',
  battery: 'battery-50',
  run: 'run',
  moon: 'weather-night',
  brain: 'brain',
  heart: 'heart-outline',
  sleep: 'sleep',
  food: 'food-apple-outline',
  water: 'cup-water',
};

export const ICON_KEYS = Object.keys(GLYPHS);

interface CategoryIconProps {
  icon: string;
  size?: number;
  /** Greys the chip out for categories with no score yet. */
  muted?: boolean;
}

export function CategoryIcon({ icon, size = 40, muted }: CategoryIconProps) {
  const glyph = GLYPHS[icon] ?? GLYPHS.sun;
  return (
    <View
      style={[
        styles.chip,
        {
          width: size,
          height: size,
          borderRadius: radii.md,
          backgroundColor: muted ? colors.chipIdle : colors.tealChip,
        },
      ]}
    >
      <MaterialCommunityIcons
        name={glyph}
        size={size * 0.5}
        color={muted ? colors.inkMuted : colors.teal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { alignItems: 'center', justifyContent: 'center' },
});
