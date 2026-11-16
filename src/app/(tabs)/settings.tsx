import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Avatar } from '../../components/Avatar';
import { BackLink } from '../../components/ScreenTop';
import { Card } from '../../components/Card';
import { CategoryIcon } from '../../components/CategoryIcon';
import { TimePicker } from '../../components/TimePicker';
import { Text } from '../../components/Text';
import { colors, radii } from '../../theme';
import type { QuestionRow } from '../../lib/database.types';
import { useAuth } from '../../providers/AuthProvider';
import { useData } from '../../providers/DataProvider';
import { LOCALES, LOCALE_NAMES, type Locale, useI18n } from '../../i18n';

const DANGER = '#C4342B';

export default function SettingsScreen() {
  const router = useRouter();
  const { profile, setPushEnabled, signOut } = useAuth();
  const { questions, updateQuestion } = useData();
  const { t, fmt, preference, setPreference } = useI18n();
  const [editingTimeFor, setEditingTimeFor] = useState<QuestionRow | null>(null);

  const pushEnabled = profile?.push_enabled ?? false;
  // The editing screens are built for a desktop browser, so only link them there.
  const canEditContent =
    Platform.OS === 'web' && (profile?.role === 'content_editor' || profile?.role === 'super_admin');
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
                {questions.length === 1
                  ? t('settings.questionCountOne')
                  : t('settings.questionCountOther', { count: questions.length })}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
          </Pressable>
        </Card>

        <Text variant="heading" style={styles.notificationsTitle}>
          {t('settings.notifications')}
        </Text>

        <Card style={styles.pushCard} padded={false}>
          <View style={styles.pushRow}>
            <Ionicons name="notifications-outline" size={20} color={colors.accent} />
            <View style={styles.pushText}>
              <Text variant="bodyStrong">{t('settings.push')}</Text>
              <Text variant="small" color={colors.inkMuted}>
                {t('settings.pushSub')}
              </Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={(next) => void setPushEnabled(next)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
              ios_backgroundColor={colors.border}
            />
          </View>
        </Card>

        <Card style={styles.scheduleCard} padded={false}>
          {questions.map((question, i) => (
            <View
              key={question.id}
              style={[styles.scheduleRow, i < questions.length - 1 && styles.divider]}
            >
              <CategoryIcon icon={question.icon} size={34} muted={!pushEnabled} />
              <Text variant="body" style={styles.scheduleLabel}>
                {question.title}
              </Text>
              <Pressable
                onPress={() =>
                  void updateQuestion(question.id, { reminder_next_day: !question.reminder_next_day })
                }
                accessibilityRole="switch"
                accessibilityState={{ checked: question.reminder_next_day }}
                accessibilityLabel={t('settings.dayToggleA11y', { title: question.title })}
                style={({ pressed }) => [
                  styles.dayPill,
                  question.reminder_next_day && styles.dayPillNext,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  variant="caption"
                  color={question.reminder_next_day ? colors.onTint : colors.inkMuted}
                >
                  {question.reminder_next_day ? t('settings.nextDay') : t('settings.sameDay')}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setEditingTimeFor(question)}
                accessibilityRole="button"
                accessibilityLabel={t('settings.changeTimeA11y', { title: question.title })}
                style={({ pressed }) => [styles.timePill, pressed && styles.pressed]}
              >
                <Text variant="smallStrong">{fmt.time(question.reminder_time)}</Text>
              </Pressable>
            </View>
          ))}
        </Card>
        <Text variant="caption" color={colors.inkMuted} style={styles.scheduleHint}>
          {t('settings.nextDayHint')}
        </Text>

        <Card padded={false} style={styles.goalRemindersCard}>
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

      {editingTimeFor && (
        <TimePicker
          value={editingTimeFor.reminder_time}
          onChange={(next) => {
            void updateQuestion(editingTimeFor.id, { reminder_time: next });
            // Keep the sheet's own value in step while it stays open on iOS.
            setEditingTimeFor((q) => (q ? { ...q, reminder_time: next } : q));
          }}
          onDismiss={() => setEditingTimeFor(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  subtitle: { marginTop: 4, marginBottom: 20 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  questionsCard: { marginTop: 14 },
  notificationsTitle: { marginTop: 32, marginBottom: 12 },
  pushCard: { marginBottom: 14 },
  pushRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  pushText: { flex: 1 },
  scheduleCard: { paddingHorizontal: 16 },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.surface },
  scheduleLabel: { flex: 1 },
  dayPill: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  dayPillNext: { backgroundColor: colors.tint },
  scheduleHint: { marginTop: 8, marginHorizontal: 4 },
  goalRemindersCard: { marginTop: 14 },
  timePill: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
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
