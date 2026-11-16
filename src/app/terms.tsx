import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '../components/Text';
import { colors } from '../theme';
import { parseLocalDate } from '../lib/dates';
import { useI18n } from '../i18n';

// TODO: replace with a real support address before submitting to the App Store.
const CONTACT_EMAIL = 'support@fettle-life.com';
const LAST_UPDATED = '2026-11-06';

/**
 * Terms of Use and Privacy Policy in one screen. Reachable signed out (from the
 * sign-in footer) as well as from Settings, so it must not use AppHeader, whose
 * History and Settings buttons only make sense with a session.
 */
export default function TermsScreen() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const lastUpdated = parseLocalDate(LAST_UPDATED).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={goBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Text variant="bodyStrong">{t('common.termsAndPrivacy')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="title">{t('common.termsAndPrivacy')}</Text>
        <Text variant="small" color={colors.inkMuted} style={styles.updated}>
          {t('terms.lastUpdated', { date: lastUpdated })}
        </Text>

        <Section title={t('terms.shortTitle')}>{t('terms.shortBody')}</Section>

        <Heading>{t('terms.termsHeading')}</Heading>
        <Section title={t('terms.usingTitle')}>{t('terms.usingBody')}</Section>
        <Section title={t('terms.medicalTitle')}>{t('terms.medicalBody')}</Section>
        <Section title={t('terms.useTitle')}>{t('terms.useBody')}</Section>
        <Section title={t('terms.serviceTitle')}>{t('terms.serviceBody')}</Section>
        <Section title={t('terms.endingTitle')}>{t('terms.endingBody')}</Section>

        <Heading>{t('terms.privacyHeading')}</Heading>
        <Section title={t('terms.storeTitle')}>{t('terms.storeBody')}</Section>
        <Section title={t('terms.dontTitle')}>{t('terms.dontBody')}</Section>
        <Section title={t('terms.howTitle')}>{t('terms.howBody')}</Section>
        <Section title={t('terms.whereTitle')}>{t('terms.whereBody')}</Section>
        <Section title={t('terms.choicesTitle')}>{t('terms.choicesBody')}</Section>
        <Section title={t('terms.contactTitle')}>{t('terms.contactBody')}</Section>
        <Pressable
          onPress={() => void Linking.openURL(`mailto:${CONTACT_EMAIL}`)}
          accessibilityRole="link"
        >
          <Text variant="bodyStrong" color={colors.accent}>
            {CONTACT_EMAIL}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <Text variant="heading" style={styles.heading}>
      {children}
    </Text>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="bodyStrong" style={styles.sectionTitle}>
        {title}
      </Text>
      <Text variant="small" color={colors.inkMuted} style={styles.sectionBody}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerSpacer: { width: 24 },
  content: { paddingHorizontal: 20, paddingBottom: 48 },
  updated: { marginTop: 4, marginBottom: 20 },
  heading: { marginTop: 18, marginBottom: 12 },
  section: { marginBottom: 18 },
  sectionTitle: { marginBottom: 4 },
  sectionBody: { lineHeight: 20 },
});
