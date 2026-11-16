import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radii } from '../theme';
import { Text } from './Text';

interface HeroCardProps {
  label: string;
  value: string;
  /** Small line under the value. */
  detail?: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress?: () => void;
  accessibilityLabel?: string;
  /** Shown under the card, e.g. a progress bar. 0–1. */
  progress?: number;
}

/** The orange summary card at the top of Home, Goals and Awards. */
export function HeroCard({
  label,
  value,
  detail,
  icon,
  onPress,
  accessibilityLabel,
  progress,
}: HeroCardProps) {
  const body = (
    <View style={styles.card}>
      <View style={styles.text}>
        <Text variant="small" color={colors.white} style={styles.label}>
          {label}
        </Text>
        <Text variant="heading" color={colors.white}>
          {value}
        </Text>
        {detail ? (
          <Text variant="caption" color={colors.white} style={styles.label}>
            {detail}
          </Text>
        ) : null}
      </View>
      <View style={styles.badge}>
        <Ionicons name={icon} size={24} color={colors.ink} />
      </View>
    </View>
  );
  return (
    <View style={styles.wrap}>
      {onPress ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? `${label}: ${value}`}
          style={({ pressed }) => pressed && styles.pressed}
        >
          {body}
        </Pressable>
      ) : (
        body
      )}
      {progress != null && (
        <View
          style={styles.track}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
        >
          <View
            style={[
              styles.fill,
              { width: `${Math.round(Math.min(Math.max(progress, 0), 1) * 100)}%` },
            ]}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 22 },
  card: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  text: { flex: 1 },
  label: { opacity: 0.9 },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.tint,
    marginTop: 10,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 999, backgroundColor: colors.primary },
  pressed: { opacity: 0.85 },
});
