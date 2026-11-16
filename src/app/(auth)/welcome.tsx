import { Image, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '../../components/Button';
import { LanguageSwitch } from '../../components/LanguageSwitch';
import { Text } from '../../components/Text';
import { useI18n } from '../../i18n';
import { colors, radii } from '../../theme';

export default function WelcomeScreen() {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topRow}>
        <View style={styles.wordmark}>
          <Ionicons name="sunny" size={16} color={colors.primary} style={styles.sun} />
          <Text variant="bodyStrong">Fettle</Text>
        </View>
        <View style={styles.language}>
          <LanguageSwitch />
        </View>
      </View>

      <View style={styles.hero}>
        <Image
          source={require('../../../assets/images/welcome.png')}
          style={styles.illustration}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      </View>

      <View style={styles.copy}>
        <Text variant="title" center>
          {t('welcome.title')}
        </Text>
        <Text variant="body" color={colors.ink} center style={styles.lead}>
          {t('welcome.lead')}
        </Text>
        <Text variant="small" color={colors.inkMuted} center>
          {t('welcome.sub')}
        </Text>
      </View>

      <View style={styles.actions}>
        <Button label={t('welcome.getStarted')} onPress={() => router.push('/sign-in?mode=signup')} />
        <Button
          label={t('welcome.haveAccount')}
          variant="secondary"
          onPress={() => router.push('/sign-in?mode=login')}
        />
        <View style={styles.privacy}>
          <Ionicons name="lock-closed" size={12} color={colors.accent} />
          <Text variant="caption" color={colors.inkMuted}>
            {t('welcome.privacy')}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white, paddingHorizontal: 24 },
  // The switch sits in the corner without pushing the wordmark off-center.
  topRow: { paddingTop: 8, justifyContent: 'center' },
  wordmark: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  language: { position: 'absolute', right: 0, top: 4 },
  sun: { marginRight: 5 },
  // design/welcome_image.png, scaled down. The ratio sits on the wrapper
  // because react-native-web's Image ignores aspectRatio.
  hero: { marginTop: 24, width: '100%', aspectRatio: 1200 / 827, borderRadius: radii.xl, overflow: 'hidden' },
  illustration: { width: '100%', height: '100%' },
  copy: { marginTop: 28 },
  lead: { marginTop: 12 },
  actions: { marginTop: 'auto', paddingBottom: 12, gap: 12 },
  privacy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 6,
  },
});
