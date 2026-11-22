import { useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

import { AppVersion } from '../../components/AppVersion';
import { Avatar } from '../../components/Avatar';
import { BackLink } from '../../components/ScreenTop';
import { Card } from '../../components/Card';
import { Text } from '../../components/Text';
import { colors } from '../../theme';
import { useAuth } from '../../providers/AuthProvider';
import { useData } from '../../providers/DataProvider';
import { LOCALES, LOCALE_NAMES, type Locale, useI18n } from '../../i18n';

const DANGER = '#C4342B';
const SUPPORT_EMAIL = 'support@sunsteps.eu';

export default function SettingsScreen() {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const { questions } = useData();
  const { t, preference, setPreference } = useI18n();
  // The editing screens are built for a desktop browser, so only link them there.
  const canEditContent =
    Platform.OS === 'web' && (profile?.role === 'content_editor' || profile?.role === 'super_admin');
  const [noMailApp, setNoMailApp] = useState(false);

  // Opens the mail app with the version and device filled in, which is most of
  // what's needed to follow up on a bug report.
  const sendFeedback = async () => {
    const details = [
      `${t('common.appName')} ${Constants.expoConfig?.version ?? ''}`,
      `${Platform.OS} ${Platform.Version}`,
    ].join(' · ');
    const url =
      `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(t('settings.feedbackSubject'))}` +
      `&body=${encodeURIComponent(`\n\n\n— ${details}`)}`;
    try {
      await Linking.openURL(url);
      setNoMailApp(false);
    } catch {
      setNoMailApp(true);
    }
  };

  const languageOptions: { value: Locale | null; label: string }[] = [
    { value: null, label: t('settings.languageSystem') },
    ...LOCALES.map((l) => ({ value: l, label: LOCALE_NAMES[l] })),
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <BackLink inset />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="title">{t('settings.title')}</Text>
        <Text variant="small" color={colors.inkMuted} style={styles.subtitle}>
          {t('settings.subtitle')}
        </Text>

        <Card padded={false}>
          <Pressable
            onPress={() => router.push('/profile')}
            accessibilityRole="button"
            accessibilityLabel={t('settings.editProfile')}
            style={({ pressed }) => [styles.profileRow, pressed && styles.pressed]}
          >
            <Avatar url={profile?.avatar_url} name={profile?.display_name} size={52} />
            <View style={styles.accountText}>
              <Text variant="bodyStrong">{profile?.display_name || t('profile.noName')}</Text>
              <Text variant="small" color={colors.accent}>
                {t('settings.editProfile')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
          </Pressable>
        </Card>

        <Card padded={false} style={styles.questionsCard}>
          <Pressable
            onPress={() => router.push('/questions')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.accountRow, pressed && styles.pressed]}
          >
            <Ionicons name="create-outline" size={20} color={colors.accent} />
            <View style={styles.accountText}>
              <Text variant="bodyStrong">{t('questions.title')}</Text>
              <Text variant="small" color={colors.inkMuted}>
                {t('settings.questionsSub', { count: questions.length })}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
          </Pressable>
        </Card>

        <Card padded={false} style={styles.questionsCard}>
          <Pressable
            onPress={() => router.push('/reminders')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.accountRow, pressed && styles.pressed]}
          >
            <Ionicons name="alarm-outline" size={20} color={colors.accent} />
            <View style={styles.accountText}>
              <Text variant="bodyStrong">{t('settings.goalReminders')}</Text>
              <Text variant="small" color={colors.inkMuted}>
                {t('settings.goalRemindersSub')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
          </Pressable>
        </Card>

        <Card padded={false} style={styles.questionsCard}>
          <Pressable
            onPress={sendFeedback}
            accessibilityRole="button"
            style={({ pressed }) => [styles.accountRow, pressed && styles.pressed]}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.accent} />
            <View style={styles.accountText}>
              <Text variant="bodyStrong">{t('settings.feedback')}</Text>
              <Text variant="small" color={noMailApp ? DANGER : colors.inkMuted}>
                {noMailApp
                  ? t('settings.feedbackNoMailApp', { email: SUPPORT_EMAIL })
                  : t('settings.feedbackSub', { email: SUPPORT_EMAIL })}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
          </Pressable>
        </Card>

        <Text variant="heading" style={styles.accountTitle}>
          {t('settings.language')}
        </Text>

        <Card padded={false} style={styles.languageCard}>
          {languageOptions.map((option, i) => {
            const active = option.value === preference;
            return (
              <Pressable
                key={option.value ?? 'system'}
                onPress={() => setPreference(option.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                style={({ pressed }) => [
                  styles.languageRow,
                  i > 0 && styles.rowDivider,
                  pressed && styles.pressed,
                ]}
              >
                <Text variant={active ? 'bodyStrong' : 'body'} style={styles.accountText}>
                  {option.label}
                </Text>
                {active && <Ionicons name="checkmark" size={20} color={colors.accent} />}
              </Pressable>
            );
          })}
        </Card>

        <Text variant="heading" style={styles.accountTitle}>
          {t('settings.account')}
        </Text>

        <Card style={styles.accountCard} padded={false}>
          <Pressable
            onPress={() => router.push('/change-password')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.accountRow, pressed && styles.pressed]}
          >
            <Ionicons name="lock-closed-outline" size={20} color={colors.accent} />
            <View style={styles.accountText}>
              <Text variant="bodyStrong">{t('settings.changePassword')}</Text>
              <Text variant="small" color={colors.inkMuted}>
                {profile?.display_name
                  ? t('settings.signedInAs', { name: profile.display_name })
                  : t('settings.updatePassword')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/terms')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.accountRow, styles.rowDivider, pressed && styles.pressed]}
          >
            <Ionicons name="document-text-outline" size={20} color={colors.accent} />
            <View style={styles.accountText}>
              <Text variant="bodyStrong">{t('common.termsAndPrivacy')}</Text>
              <Text variant="small" color={colors.inkMuted}>
                {t('settings.termsSub')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
          </Pressable>
          {canEditContent && (
            <Pressable
              onPress={() => router.push('/admin')}
              accessibilityRole="button"
              style={({ pressed }) => [styles.accountRow, styles.rowDivider, pressed && styles.pressed]}
            >
              <Ionicons name="language-outline" size={20} color={colors.accent} />
              <View style={styles.accountText}>
                <Text variant="bodyStrong">{t('settings.contentAdmin')}</Text>
                <Text variant="small" color={colors.inkMuted}>
                  {t('settings.contentAdminSub')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
            </Pressable>
          )}
          <Pressable
            onPress={() => router.push('/delete-account')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.accountRow, styles.rowDivider, pressed && styles.pressed]}
          >
            <Ionicons name="trash-outline" size={20} color={DANGER} />
            <View style={styles.accountText}>
              <Text variant="bodyStrong" color={DANGER}>
                {t('settings.deleteAccount')}
              </Text>
              <Text variant="small" color={colors.inkMuted}>
                {t('settings.deleteSub')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
          </Pressable>
        </Card>

        <AppVersion />

        <Pressable
          onPress={() => void signOut()}
          accessibilityRole="button"
          style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}
        >
          <Text variant="bodyStrong" color={colors.inkMuted} center>
            {t('settings.logOut')}
          </Text>
        </Pressable>
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  subtitle: { marginTop: 4, marginBottom: 20 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  questionsCard: { marginTop: 14 },
  accountTitle: { marginTop: 32, marginBottom: 12 },
  accountCard: {},
  languageCard: {},
  languageRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  accountText: { flex: 1 },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.surface },
  signOut: { marginTop: 18, paddingVertical: 14 },
  pressed: { opacity: 0.7 },
});
