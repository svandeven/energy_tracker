import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '../components/Card';
import { CategoryIcon } from '../components/CategoryIcon';
import { ScreenTop } from '../components/ScreenTop';
import { Text } from '../components/Text';
import { colors, fonts, radii } from '../theme';
import type { QuestionRow } from '../lib/database.types';
import { useData } from '../providers/DataProvider';
import { useI18n } from '../i18n';

/** Edit, add and remove the daily energy questions. Opened from Settings. */
export default function QuestionsScreen() {
  const { questions, updateQuestion, addQuestion, deleteQuestion } = useData();
  const { t, locale } = useI18n();

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

        <Text variant="caption" color={colors.inkMuted} style={styles.hint}>
          {t('questions.remindersHint')}
        </Text>
      </ScrollView>
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
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
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
  hint: { marginTop: 12, marginHorizontal: 4 },
  pressed: { opacity: 0.7 },
});
