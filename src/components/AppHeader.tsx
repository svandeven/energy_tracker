import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { colors } from '../theme';
import { Text } from './Text';

/**
 * The persistent header from the mockups: history glyph on the left, the
 * "⚡ Energy Score" wordmark centered, settings gear on the right.
 */
export function AppHeader({ onBackground = 'white' }: { onBackground?: 'white' | 'surface' }) {
  const router = useRouter();
  return (
    <View
      style={[
        styles.row,
        { backgroundColor: onBackground === 'white' ? colors.white : colors.surface },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="History"
        hitSlop={12}
        onPress={() => router.push('/history')}
      >
        <Ionicons name="analytics-outline" size={22} color={colors.green} />
      </Pressable>

      <View style={styles.wordmark}>
        <Text variant="caption" style={styles.bolt}>
          ⚡
        </Text>
        <Text variant="bodyStrong">Energy Score</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Settings"
        hitSlop={12}
        onPress={() => router.push('/settings')}
      >
        <Ionicons name="settings-sharp" size={20} color={colors.teal} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  wordmark: { flexDirection: 'row', alignItems: 'center' },
  bolt: { fontSize: 14, marginRight: 4 },
});
