import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '../components/Button';
import { Text } from '../components/Text';
import { colors } from '../theme';
import { useI18n } from '../i18n';
import { useAuth } from '../providers/AuthProvider';
import { takeReturnTo } from '../lib/returnTo';

/** How long to wait for the code exchange before offering a way out. */
const TIMEOUT_MS = 10_000;

/**
 * Where Google/Apple sign-in and the email-confirmation link land
 * (`oauthRedirectUri()` in AuthProvider). The `?code=` itself is exchanged
 * elsewhere — by supabase-js from the address bar on web, by AuthProvider's
 * deep-link handler on native — so this screen only waits for the session.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { session } = useAuth();
  const params = useLocalSearchParams<{ error_description?: string }>();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (session) router.replace((takeReturnTo() ?? '/') as Href);
  }, [session, router]);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  const failed = Boolean(params.error_description) || (timedOut && !session);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.centered}>
        {failed ? (
          <>
            <Text variant="heading" center>
              {t('authCallback.failed')}
            </Text>
            {params.error_description && (
              <Text variant="small" color={colors.inkMuted} center>
                {params.error_description}
              </Text>
            )}
            <Button
              label={t('forgot.backToLogin')}
              onPress={() => router.replace('/sign-in?mode=login')}
              style={styles.button}
            />
          </>
        ) : (
          <>
            <ActivityIndicator color={colors.primary} />
            <Text variant="small" color={colors.inkMuted} center>
              {t('authCallback.signingIn')}
            </Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  button: { alignSelf: 'stretch', marginTop: 8 },
});
