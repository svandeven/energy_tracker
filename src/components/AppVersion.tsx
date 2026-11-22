import { useCallback, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import * as Updates from 'expo-updates';

import { colors } from '../theme';
import { type TranslationKey, useI18n } from '../i18n';
import { Card } from './Card';
import { Text } from './Text';

type Status = 'checking' | 'downloading' | 'latest' | 'ready' | 'failed' | 'offline';

const STATUS_TEXT: Record<Status, TranslationKey> = {
  checking: 'version.checking',
  downloading: 'version.downloading',
  latest: 'version.latest',
  ready: 'version.ready',
  failed: 'version.failed',
  offline: 'version.offline',
};

const IS_WEB = Platform.OS === 'web';
// Development builds and the website don't take over-the-air updates.
const CAN_UPDATE = !IS_WEB && !__DEV__ && Updates.isEnabled;

async function findUpdate(onDownload: () => void): Promise<Status> {
  try {
    const result = await Updates.checkForUpdateAsync();
    if (result.isAvailable || result.isRollBackToEmbedded) {
      onDownload();
      await Updates.fetchUpdateAsync();
      return 'ready';
    }
    // An update that crashed on launch is never offered again, so "no update"
    // doesn't mean this is the newest code.
    const crashed =
      Updates.isEmergencyLaunch ||
      result.reason === Updates.UpdateCheckResultNotAvailableReason.UPDATE_PREVIOUSLY_FAILED;
    return crashed ? 'failed' : 'latest';
  } catch {
    return 'offline';
  }
}

/**
 * The installed build and the JavaScript update running on it. Looks for a
 * newer update whenever Settings opens or the row is tapped; once one has
 * downloaded, tapping restarts into it.
 */
export function AppVersion() {
  const { t } = useI18n();
  const { isUpdatePending } = Updates.useUpdates();
  const [checked, setChecked] = useState<Status>('checking');

  const check = useCallback(async () => {
    if (!CAN_UPDATE) return;
    setChecked('checking');
    setChecked(await findUpdate(() => setChecked('downloading')));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void check();
    }, [check]),
  );

  const status = isUpdatePending ? 'ready' : checked;
  const busy = status === 'checking' || status === 'downloading';

  const version = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '';
  const number: string = Constants.expoConfig?.extra?.updateNumber ?? '?';
  const build = IS_WEB ? number : (Application.nativeBuildVersion ?? '?');

  const onPress = () => {
    if (status === 'ready') Updates.reloadAsync().catch(() => setChecked('failed'));
    else void check();
  };

  return (
    <Card padded={false} style={styles.card}>
      <Pressable
        onPress={onPress}
        disabled={!CAN_UPDATE || busy}
        accessibilityRole={CAN_UPDATE ? 'button' : undefined}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <Ionicons name="information-circle-outline" size={20} color={colors.accent} />
        <View style={styles.text}>
          <Text variant="bodyStrong">{t('version.title', { version, build })}</Text>
          {!IS_WEB && (
            <Text variant="small" color={colors.inkMuted}>
              {!CAN_UPDATE
                ? t('version.development')
                : Updates.isEmbeddedLaunch
                  ? t('version.noUpdate')
                  : t('version.update', { number })}
            </Text>
          )}
          {CAN_UPDATE && (
            <Text
              variant="smallStrong"
              color={status === 'ready' ? colors.accent : colors.inkMuted}
              accessibilityLiveRegion="polite"
            >
              {t(STATUS_TEXT[status])}
            </Text>
          )}
        </View>
        {CAN_UPDATE && !busy && <Ionicons name="refresh" size={18} color={colors.inkFaint} />}
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  text: { flex: 1 },
  pressed: { opacity: 0.7 },
});
