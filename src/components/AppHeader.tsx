import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { colors } from '../theme';
import { useI18n } from '../i18n';
import { Text } from './Text';

/**
 * The persistent header from the mockups: history glyph on the left, the
 * sun + app-name wordmark (matching the welcome screen) centered, settings gear on the right.
 */
export function AppHeader({ onBackground = 'white' }: { onBackground?: 'white' | 'surface' }) {
  const router = useRouter();
  const { t } = useI18n();
  return (
    <View
      style={[
        styles.row,
        { backgroundColor: onBackground === 'white' ? colors.white : colors.surface },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('tabs.history')}
        hitSlop={12}
        onPress={() => router.push('/history')}
      >
        <Ionicons name="analytics-outline" size={22} color={colors.accent} />
      </Pressable>

      <View style={styles.wordmark}>
        <Ionicons name="sunny" size={16} color={colors.primary} style={styles.mark} />
        <Text variant="bodyStrong">{t('common.appName')}</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('tabs.settings')}
        hitSlop={12}
        onPress={() => router.push('/settings')}
      >
        <Ionicons name="settings-sharp" size={20} color={colors.accent} />
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
  mark: { marginRight: 5 },
});
