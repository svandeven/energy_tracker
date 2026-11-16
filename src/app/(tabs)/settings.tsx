import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AppHeader } from '../../components/AppHeader';
import { Card } from '../../components/Card';
import { CategoryIcon } from '../../components/CategoryIcon';
import { TimePicker } from '../../components/TimePicker';
import { Text } from '../../components/Text';
import { colors, fonts, radii } from '../../theme';
import type { QuestionRow } from '../../lib/database.types';
import { useAuth } from '../../providers/AuthProvider';
import { useData } from '../../providers/DataProvider';
import { LOCALES, LOCALE_NAMES, type Locale, useI18n } from '../../i18n';

const DANGER = '#C4342B';

export default function SettingsScreen() {
  const router = useRouter();
  const { profile, setPushEnabled, signOut } = useAuth();
  const { questions, updateQuestion, addQuestion, deleteQuestion } = useData();
  const { t, fmt, locale, preference, setPreference } = useI18n();
  const [editingTimeFor, setEditingTimeFor] = useState<QuestionRow | null>(null);

  const pushEnabled = profile?.push_enabled ?? false;
  // The editing screens are built for a desktop browser, so only link them there.
  const canEditContent =
    Platform.OS === 'web' && (profile?.role === 'content_editor' || profile?.role === 'super_admin');
  const languageOptions: { value: Locale | null; label: string }[] = [
    { value: null, label: t('settings.languageSystem') },
    ...LOCALES.map((l) => ({ value: l, label: LOCALE_NAMES[l] })),
  ];

  const confirmDelete = (question: QuestionRow) => {
    Alert.alert(
      t('settings.removeTitle', { title: question.title }),
      t('settings.removeBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.remove'),
          style: 'destructive',
          onPress: () => void deleteQuestion(question.id),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader onBackground="surface" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="title">{t('settings.title')}</Text>
        <Text variant="small" color={colors.inkMuted} style={styles.subtitle}>
          {t('settings.subtitle')}
        </Text>

        <Text variant="heading">{t('settings.questionManager')}</Text>
        <Text variant="small" color={colors.inkMuted} style={styles.sectionSub}>
          {questions.length === 1
            ? t('settings.questionCountOne')
            : t('settings.questionCountOther', { count: questions.length })}
        </Text>

        {questions.map((question) => (
          <QuestionEditor
            // Remount on language change so the fields pick up the new wording.
            key={`${question.id}:${locale}`}
            question={question}
            onChange={(patch) => void updateQuestion(question.id, patch)}
            onDelete={questions.length > 1 ? () => confirmDelete(question) : undefined}
          />
        ))}

        <Pressable
          onPress={() => void addQuestion()}
          accessibilityRole="button"
          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
        >
          <Ionicons name="add" size={18} color={colors.accent} />
          <Text variant="bodyStrong" color={colors.accent}>
            {t('settings.addQuestion')}
          </Text>
        </Pressable>

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

function QuestionEditor({
  question,
  onChange,
  onDelete,
}: {
  question: QuestionRow;
  onChange: (patch: Partial<QuestionRow>) => void;
  onDelete?: () => void;
}) {
  const { t } = useI18n();
  // Kept in local state so typing stays responsive; persisted on blur.
  const [title, setTitle] = useState(question.title);
  const [labels, setLabels] = useState<string[]>(question.score_labels);

  const commitLabel = (score: number, value: string) => {
    const next = [...labels];
    next[score] = value;
    setLabels(next);
  };

  return (
    <Card style={styles.questionCard}>
      <View style={styles.questionHeader}>
        <CategoryIcon icon={question.icon} size={38} />
        {onDelete && (
          <Pressable
            onPress={onDelete}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('settings.removeA11y', { title: question.title })}
          >
            <Ionicons name="trash-outline" size={18} color={colors.inkFaint} />
          </Pressable>
        )}
      </View>

      <Text variant="label" color={colors.inkMuted} style={styles.fieldLabel}>
        {t('settings.question')}
      </Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        onBlur={() => title.trim() && title !== question.title && onChange({ title: title.trim() })}
        style={[styles.textField, styles.textFieldCentered]}
        placeholder={t('settings.questionPlaceholder')}
        placeholderTextColor={colors.inkFaint}
      />

      <Text variant="label" color={colors.inkMuted} style={styles.fieldLabel}>
        {t('settings.scoreDescriptions')}
      </Text>
      {[0, 1, 2].map((score) => (
        <View key={score} style={styles.labelRow}>
          <Text variant="label" color={score === 0 ? colors.inkMuted : score === 1 ? colors.accent : colors.primary}>
            {score}
          </Text>
          <TextInput
            value={labels[score] ?? ''}
            onChangeText={(value) => commitLabel(score, value)}
            onBlur={() => {
              if (labels[score] !== question.score_labels[score]) {
                onChange({ score_labels: labels });
              }
            }}
            style={[styles.textField, styles.textFieldCentered, styles.labelField]}
            placeholder={t('settings.describeScore', { score })}
            placeholderTextColor={colors.inkFaint}
          />
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  subtitle: { marginTop: 4, marginBottom: 26 },
  sectionSub: { marginTop: 2, marginBottom: 14 },
  questionCard: { marginBottom: 14 },
  questionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fieldLabel: { marginTop: 14, marginBottom: 6 },
  textField: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.ink,
  },
  textFieldCentered: { textAlign: 'center' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  labelField: { flex: 1 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: colors.white,
  },
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
