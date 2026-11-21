import { Linking, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useI18n } from '../i18n';
import { colors, radii } from '../theme';
import { Button } from './Button';
import { Text } from './Text';

const STORE_URL =
  Platform.OS === 'android'
    ? 'https://play.google.com/store/apps/details?id=eu.sunsteps.app'
    : 'https://apps.apple.com/app/id6836455569';

/** Blocks the app when this version is too old to keep working (see useUpdateRequired). */
export function UpdateRequired({ message }: { message: string | null }) {
  const { t } = useI18n();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <View style={styles.badge}>
          <Ionicons name="arrow-up-circle" size={36} color={colors.primary} />
        </View>
        <Text variant="title" center>
          {t('update.title')}
        </Text>
        <Text variant="body" color={colors.inkMuted} center style={styles.body}>
          {message ?? t('update.body')}
        </Text>
        <Button label={t('update.button')} onPress={() => void Linking.openURL(STORE_URL)} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  content: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  badge: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  body: { marginBottom: 12 },
});
