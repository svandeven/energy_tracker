import { useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '../components/Card';
import { CategoryIcon } from '../components/CategoryIcon';
import { ScreenTop } from '../components/ScreenTop';
import { Text } from '../components/Text';
import { TimePicker } from '../components/TimePicker';
import { colors, fonts, radii } from '../theme';
import type { QuestionRow } from '../lib/database.types';
import { useAuth } from '../providers/AuthProvider';
import { useData } from '../providers/DataProvider';
import { useI18n } from '../i18n';

/**
 * Everything about the daily energy questions in one place: wording, order,
 * reminder times and the push switch. Opened from Settings.
 */
export default function QuestionsScreen() {
  const { profile, setPushEnabled } = useAuth();
  const { questions, updateQuestion, addQuestion, deleteQuestion, moveQuestion } = useData();
  const { t, locale } = useI18n();
  const [editingTimeFor, setEditingTimeFor] = useState<QuestionRow | null>(null);

  const pushEnabled = profile?.push_enabled ?? false;

  const confirmDelete = (question: QuestionRow) => {
    const title = t('settings.removeTitle', { title: question.title });
    // Alert.alert does nothing in a browser, so ask with the browser's own dialog.
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${t('settings.removeBody')}`))
        void deleteQuestion(question.id);
      return;
    }
    Alert.alert(title, t('settings.removeBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.remove'),
        style: 'destructive',
        onPress: () => void deleteQuestion(question.id),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenTop
          back
          title={t('questions.title')}
          subtitle={
            questions.length === 1
              ? t('settings.questionCountOne')
              : t('settings.questionCountOther', { count: questions.length })
          }
        />

        <Card style={styles.pushCard} padded={false}>
          <View style={styles.pushRow}>
            <Ionicons name="notifications-outline" size={20} color={colors.accent} />
            <View style={styles.flex}>
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

        {questions.map((question, i) => (
          <QuestionEditor
            // Remount on language change so the fields pick up the new wording.
            key={`${question.id}:${locale}`}
            question={question}
            pushEnabled={pushEnabled}
            onChange={(patch) => void updateQuestion(question.id, patch)}
            onDelete={questions.length > 1 ? () => confirmDelete(question) : undefined}
            onMoveUp={i > 0 ? () => void moveQuestion(question.id, -1) : undefined}
            onMoveDown={
              i < questions.length - 1 ? () => void moveQuestion(question.id, 1) : undefined
            }
            onEditTime={() => setEditingTimeFor(question)}
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

        <Text variant="caption" color={colors.inkMuted} style={styles.hint}>
          {t('settings.nextDayHint')}
        </Text>
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

function IconButton({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !onPress }}
      style={({ pressed }) => [
        styles.iconButton,
        !onPress && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={18} color={colors.inkMuted} />
    </Pressable>
  );
}

function QuestionEditor({
  question,
  pushEnabled,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  onEditTime,
}: {
  question: QuestionRow;
  pushEnabled: boolean;
  onChange: (patch: Partial<QuestionRow>) => void;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onEditTime: () => void;
}) {
  const { t, fmt } = useI18n();
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
        <View style={styles.headerActions}>
          <IconButton
            icon="arrow-up"
            label={t('questions.moveUpA11y', { title: question.title })}
            onPress={onMoveUp}
          />
          <IconButton
            icon="arrow-down"
            label={t('questions.moveDownA11y', { title: question.title })}
            onPress={onMoveDown}
          />
          {onDelete && (
            <IconButton
              icon="trash-outline"
              label={t('settings.removeA11y', { title: question.title })}
              onPress={onDelete}
            />
          )}
        </View>
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
          <Text
            variant="label"
            color={score === 0 ? colors.inkMuted : score === 1 ? colors.accent : colors.primary}
          >
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

      <View style={[styles.reminderRow, !pushEnabled && styles.muted]}>
        <Ionicons name="notifications-outline" size={16} color={colors.inkMuted} />
        <Text variant="label" color={colors.inkMuted} style={styles.flex}>
          {t('questions.reminder')}
        </Text>
        <Pressable
          onPress={() => onChange({ reminder_next_day: !question.reminder_next_day })}
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
          onPress={onEditTime}
          accessibilityRole="button"
          accessibilityLabel={t('settings.changeTimeA11y', { title: question.title })}
          style={({ pressed }) => [styles.timePill, pressed && styles.pressed]}
        >
          <Text variant="smallStrong">{fmt.time(question.reminder_time)}</Text>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  flex: { flex: 1 },
  pushCard: { marginBottom: 14 },
  pushRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  questionCard: { marginBottom: 14 },
  questionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.3 },
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
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.surface,
  },
  muted: { opacity: 0.5 },
  dayPill: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  dayPillNext: { backgroundColor: colors.tint },
  timePill: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
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
  hint: { marginTop: 12, marginHorizontal: 4 },
  pressed: { opacity: 0.7 },
});
