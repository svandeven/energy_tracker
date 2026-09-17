import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { AppHeader } from '../../components/AppHeader';
import { Card } from '../../components/Card';
import { CategoryIcon } from '../../components/CategoryIcon';
import { TimePicker } from '../../components/TimePicker';
import { Text } from '../../components/Text';
import { colors, fonts, radii } from '../../theme';
import { formatTime } from '../../lib/dates';
import type { QuestionRow } from '../../lib/database.types';
import { useAuth } from '../../providers/AuthProvider';
import { useData } from '../../providers/DataProvider';

export default function SettingsScreen() {
  const { profile, setPushEnabled, signOut } = useAuth();
  const { questions, updateQuestion, addQuestion, deleteQuestion } = useData();
  const [editingTimeFor, setEditingTimeFor] = useState<QuestionRow | null>(null);

  const pushEnabled = profile?.push_enabled ?? false;

  const confirmDelete = (question: QuestionRow) => {
    Alert.alert(
      `Remove "${question.title}"?`,
      'Past scores stay in your history, but you will stop being asked about it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
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
        <Text variant="title">Settings</Text>
        <Text variant="small" color={colors.inkMuted} style={styles.subtitle}>
          Manage your check-in questions and reminders
        </Text>

        <Text variant="heading">Question Manager</Text>
        <Text variant="small" color={colors.inkMuted} style={styles.sectionSub}>
          Edit your {questions.length} daily energy check-in question
          {questions.length === 1 ? '' : 's'}
        </Text>

        {questions.map((question) => (
          <QuestionEditor
            key={question.id}
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
          <Ionicons name="add" size={18} color={colors.green} />
          <Text variant="bodyStrong" color={colors.green}>
            Add new question
          </Text>
        </Pressable>

        <Text variant="heading" style={styles.notificationsTitle}>
          Notification Schedule
        </Text>

        <Card style={styles.pushCard} padded={false}>
          <View style={styles.pushRow}>
            <Ionicons name="notifications-outline" size={20} color={colors.green} />
            <View style={styles.pushText}>
              <Text variant="bodyStrong">Push notifications</Text>
              <Text variant="small" color={colors.inkMuted}>
                Get reminders to check in
              </Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={(next) => void setPushEnabled(next)}
              trackColor={{ false: colors.border, true: colors.green }}
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
                onPress={() => setEditingTimeFor(question)}
                accessibilityRole="button"
                accessibilityLabel={`Change reminder time for ${question.title}`}
                style={({ pressed }) => [styles.timePill, pressed && styles.pressed]}
              >
                <Text variant="smallStrong">{formatTime(question.reminder_time)}</Text>
              </Pressable>
            </View>
          ))}
        </Card>

        <Pressable
          onPress={() => void signOut()}
          accessibilityRole="button"
          style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}
        >
          <Text variant="bodyStrong" color={colors.inkMuted} center>
            Log out
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
            accessibilityLabel={`Remove ${question.title}`}
          >
            <Ionicons name="trash-outline" size={18} color={colors.inkFaint} />
          </Pressable>
        )}
      </View>

      <Text variant="label" color={colors.inkMuted} style={styles.fieldLabel}>
        Question
      </Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        onBlur={() => title.trim() && title !== question.title && onChange({ title: title.trim() })}
        style={[styles.textField, styles.textFieldCentered]}
        placeholder="What are you tracking?"
        placeholderTextColor={colors.inkFaint}
      />

      <Text variant="label" color={colors.inkMuted} style={styles.fieldLabel}>
        Score descriptions
      </Text>
      {[0, 1, 2].map((score) => (
        <View key={score} style={styles.labelRow}>
          <Text variant="label" color={score === 0 ? colors.inkMuted : score === 1 ? colors.teal : colors.green}>
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
            placeholder={`Describe a score of ${score}`}
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
  timePill: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  signOut: { marginTop: 32, paddingVertical: 14 },
  pressed: { opacity: 0.7 },
});
