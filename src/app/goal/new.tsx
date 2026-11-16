import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '../../components/Button';
import { ScreenTop } from '../../components/ScreenTop';
import { Text } from '../../components/Text';
import { TimePicker } from '../../components/TimePicker';
import { cardShadow, colors, fonts, radii } from '../../theme';
import type { GoalRepeat } from '../../lib/database.types';
import { appliesOn } from '../../lib/goals';
import { type TranslationKey, useI18n } from '../../i18n';
import { useGoals } from '../../providers/GoalsProvider';

const REPEATS: { value: GoalRepeat; label: TranslationKey }[] = [
  { value: 'none', label: 'addGoal.todayOnly' },
  { value: 'daily', label: 'addGoal.everyDay' },
  { value: 'weekdays', label: 'addGoal.weekdays' },
];

const IDEAS: TranslationKey[] = [
  'addGoal.idea1',
  'addGoal.idea2',
  'addGoal.idea3',
  'addGoal.idea4',
];
const DEFAULT_REMINDER = '14:00:00';

export default function AddGoalScreen() {
  const router = useRouter();
  const { t, fmt } = useI18n();
  const { date, templates, todaysGoals, addGoal, forgetTemplate } = useGoals();

  const [title, setTitle] = useState('');
  const [templateId, setTemplateId] = useState<string | undefined>();
  const [repeat, setRepeat] = useState<GoalRepeat>('none');
  const [save, setSave] = useState(false);
  const [remindAt, setRemindAt] = useState<string | null>(null);
  const [pickingTime, setPickingTime] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Saved goals that aren't on today's list already.
  const onToday = new Set(todaysGoals.map((g) => g.template_id));
  const saved = templates.filter((tpl) => tpl.repeat === 'none' && !onToday.has(tpl.id));
  const startsMonday = repeat === 'weekdays' && !appliesOn({ repeat }, date);

  const pick = (next: { title: string; templateId?: string; remindAt?: string | null }) => {
    setTitle(next.title);
    setTemplateId(next.templateId);
    if (next.templateId) setSave(true);
    if (next.remindAt !== undefined) setRemindAt(next.remindAt);
    setError(null);
  };

  const submit = async () => {
    if (!title.trim()) {
      setError(t('addGoal.titleRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await addGoal({ title, repeat, save: save || repeat !== 'none', remindAt, templateId });
      router.back();
    } catch {
      setError(t('addGoal.saveFailed'));
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ScreenTop back title={t('addGoal.title')} subtitle={t('addGoal.subtitle')} />

        <Text variant="label" style={styles.label}>
          {t('addGoal.goal')}
        </Text>
        <TextInput
          value={title}
          onChangeText={(value) => {
            setTitle(value);
            // Typing over a picked saved goal makes it a new one.
            setTemplateId(undefined);
            setError(null);
          }}
          placeholder={t('addGoal.placeholder')}
          placeholderTextColor={colors.inkFaint}
          style={styles.input}
          maxLength={200}
          returnKeyType="done"
          autoFocus
        />

        <Text variant="label" style={styles.label}>
          {t('addGoal.repeat')}
        </Text>
        <View style={styles.pills}>
          {REPEATS.map((option) => {
            const active = repeat === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setRepeat(option.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                style={[styles.pill, active && styles.pillActive]}
              >
                <Text variant="smallStrong" color={active ? colors.white : colors.ink}>
                  {t(option.label)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {startsMonday && (
          <Text variant="caption" color={colors.inkMuted} style={styles.note}>
            {t('addGoal.weekendNote')}
          </Text>
        )}

        {repeat === 'none' && (
          <View style={styles.card}>
            <View style={styles.cardText}>
              <Text variant="bodyStrong">{t('addGoal.save')}</Text>
              <Text variant="caption" color={colors.inkMuted}>
                {t('addGoal.saveSub')}
              </Text>
            </View>
            <Switch
              value={save}
              onValueChange={setSave}
              trackColor={{ false: colors.border, true: colors.done }}
              thumbColor={colors.white}
              ios_backgroundColor={colors.border}
            />
          </View>
        )}

        <View style={styles.card}>
          <Pressable
            onPress={() => setPickingTime(true)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.remindTap, pressed && styles.pressed]}
          >
            <View style={styles.cardText}>
              <Text variant="bodyStrong">{t('addGoal.remind')}</Text>
              <Text variant="caption" color={colors.inkMuted}>
                {t('addGoal.remindSub')}
              </Text>
            </View>
            <Text variant="bodyStrong" color={remindAt ? colors.primary : colors.inkMuted}>
              {remindAt ? fmt.time(remindAt) : t('addGoal.remindOff')}
            </Text>
          </Pressable>
          {remindAt && (
            <Pressable
              onPress={() => setRemindAt(null)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('goals.noReminder')}
            >
              <Ionicons name="close-circle" size={18} color={colors.inkFaint} />
            </Pressable>
          )}
        </View>

        {saved.length > 0 ? (
          <>
            <Text variant="label" style={styles.label}>
              {t('addGoal.saved')}
            </Text>
            <View style={styles.chips}>
              {saved.map((tpl) => (
                <View
                  key={tpl.id}
                  style={[styles.chip, templateId === tpl.id && styles.chipActive]}
                >
                  <Pressable
                    onPress={() =>
                      pick({ title: tpl.title, templateId: tpl.id, remindAt: tpl.remind_at })
                    }
                    accessibilityRole="button"
                  >
                    <Text variant="caption" color={colors.onTint}>
                      {tpl.title}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      if (templateId === tpl.id) setTemplateId(undefined);
                      void forgetTemplate(tpl);
                    }}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={t('addGoal.forgetA11y', { title: tpl.title })}
                  >
                    <Ionicons name="close" size={14} color={colors.onTint} />
                  </Pressable>
                </View>
              ))}
            </View>
          </>
        ) : (
          templates.length === 0 && (
            <>
              <Text variant="label" style={styles.label}>
                {t('addGoal.ideas')}
              </Text>
              <View style={styles.chips}>
                {IDEAS.map((key) => (
                  <Pressable
                    key={key}
                    onPress={() => pick({ title: t(key) })}
                    accessibilityRole="button"
                    style={styles.chip}
                  >
                    <Text variant="caption" color={colors.onTint}>
                      {t(key)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          )
        )}

        {error && (
          <Text variant="small" color="#C4342B" style={styles.error}>
            {error}
          </Text>
        )}

        <Button
          label={t('addGoal.submit')}
          variant="dark"
          loading={busy}
          onPress={() => void submit()}
          style={styles.submit}
        />
      </ScrollView>

      {pickingTime && (
        <TimePicker
          value={remindAt ?? DEFAULT_REMINDER}
          onChange={setRemindAt}
          onDismiss={() => setPickingTime(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  label: { marginTop: 18, marginBottom: 8 },
  input: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.ink,
    ...cardShadow,
  },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    backgroundColor: colors.white,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  note: { marginTop: 6 },
  card: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: 14,
    ...cardShadow,
  },
  cardText: { flex: 1 },
  remindTap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.tint,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.tint,
  },
  chipActive: { borderColor: colors.primary },
  error: { marginTop: 14 },
  submit: { marginTop: 24 },
  pressed: { opacity: 0.7 },
});
