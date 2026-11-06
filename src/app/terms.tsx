import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '../components/Text';
import { colors } from '../theme';

// TODO: replace with a real support address before submitting to the App Store.
const CONTACT_EMAIL = 'support@energyscore.app';
const LAST_UPDATED = '6 November 2026';

/**
 * Terms of Use and Privacy Policy in one screen. Reachable signed out (from the
 * sign-in footer) as well as from Settings, so it must not use AppHeader, whose
 * History and Settings buttons only make sense with a session.
 */
export default function TermsScreen() {
  const router = useRouter();

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
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Text variant="bodyStrong">Terms &amp; Privacy</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="title">Terms &amp; Privacy</Text>
        <Text variant="small" color={colors.inkMuted} style={styles.updated}>
          Last updated {LAST_UPDATED}
        </Text>

        <Section title="The short version">
          Energy Score helps you notice how your energy changes through the day. Your
          check-ins belong to you, we never sell or share them, there are no ads or
          trackers, and you can delete everything at any time from Settings.
        </Section>

        <Heading>Terms of Use</Heading>

        <Section title="Using Energy Score">
          By creating an account or using the app you agree to these terms. You need to
          be at least 13 years old, or the minimum age for digital consent where you
          live, to use it. Please keep your sign-in details to yourself; you are
          responsible for activity on your account.
        </Section>

        <Section title="Not medical advice">
          Energy Score is a self-reflection tool. Scores, averages and trends are not a
          diagnosis and are not a substitute for advice from a doctor or other qualified
          professional. If you are worried about your health, please talk to one.
        </Section>

        <Section title="Acceptable use">
          Don’t misuse the service: no attempts to access other people’s data, disrupt
          the app, or use it for anything unlawful. We may suspend accounts that do.
        </Section>

        <Section title="The service">
          We work to keep Energy Score available and your data safe, but the app is
          provided “as is”, without warranties of any kind. To the extent the law allows,
          we are not liable for indirect or consequential losses arising from its use.
          We may change or discontinue features, and will update these terms when we
          do — the date above shows the latest version. Continuing to use the app after
          a change means you accept the updated terms.
        </Section>

        <Section title="Ending your account">
          You can stop using Energy Score whenever you like. Settings → Delete account
          removes your account and all of its data permanently.
        </Section>

        <Heading>Privacy Policy</Heading>

        <Section title="What we store">
          • Your email address, and a display name derived from it or from your Apple or
          Google profile{'\n'}
          • The check-in questions you set up, their score descriptions and reminder
          times{'\n'}
          • The scores you log, with the date you logged them for{'\n'}
          • Whether you have reminders switched on
        </Section>

        <Section title="What we don’t collect">
          No location, contacts, health-app data, advertising identifiers or analytics.
          Reminders are scheduled on your device itself; their content never leaves it.
        </Section>

        <Section title="How it is used">
          Only to run the app for you: signing you in, showing your dashboard and
          history, and scheduling your reminders. We don’t sell your data, share it with
          advertisers, or use it to build profiles.
        </Section>

        <Section title="Where it lives">
          Your data is stored with our hosting provider, Supabase, which processes it on
          our behalf. Access is restricted so that each account can only ever read its
          own rows. If you sign in with Apple or Google, they confirm who you are; we
          receive your email address and name from them and nothing else.
        </Section>

        <Section title="Your choices">
          You can edit or remove questions and switch reminders off in Settings. Deleting
          your account erases your profile, questions and every check-in from our
          servers immediately. For a copy of your data or any other privacy request,
          email us and we will respond within 30 days.
        </Section>

        <Section title="Contact">
          Questions about these terms or your data?
        </Section>
        <Pressable
          onPress={() => void Linking.openURL(`mailto:${CONTACT_EMAIL}`)}
          accessibilityRole="link"
        >
          <Text variant="bodyStrong" color={colors.teal}>
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
