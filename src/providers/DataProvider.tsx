import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { CheckinRow, QuestionRow } from '../lib/database.types';
import { type LocalDate, addDays, today } from '../lib/dates';
import { useAuth } from './AuthProvider';
import { DEFAULT_QUESTIONS } from '../features/defaultQuestions';
import { useI18n } from '../i18n';
import { localizeQuestion } from '../i18n/questions';

/**
 * The chart needs 30 days and the week-over-week delta needs 14; fetch a little
 * more. This is also the backfill limit — screens only ever see check-ins from
 * inside this window, so letting someone log an older day would upsert against
 * data we never loaded and could silently overwrite a real score.
 */
export const HISTORY_WINDOW_DAYS = 45;

interface DataValue {
  /** Active questions, with seeded ones already in the current language. */
  questions: QuestionRow[];
  checkins: CheckinRow[];
  loading: boolean;
  error: string | null;
  reload(): Promise<void>;
  /** Upserts today's (or a given day's) score for one question. */
  saveScore(questionId: string, score: number, date?: LocalDate): Promise<void>;
  updateQuestion(id: string, patch: Partial<QuestionRow>): Promise<void>;
  addQuestion(): Promise<QuestionRow | null>;
  deleteQuestion(id: string): Promise<void>;
  /** Moves a question one place up (-1) or down (1). */
  moveQuestion(id: string, by: -1 | 1): Promise<void>;
}

const DataContext = createContext<DataValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const { t, errorText } = useI18n();
  const userId = session?.user?.id ?? null;

  // As stored. Screens get `questions`, the localized view of these.
  const [rawQuestions, setQuestions] = useState<QuestionRow[]>([]);
  const [checkins, setCheckins] = useState<CheckinRow[]>([]);
  const [loading, setLoading] = useState(true);
  // Kept raw and translated on read, so a language change doesn't refetch.
  const [loadError, setError] = useState<unknown>(null);

  const reload = useCallback(async () => {
    if (!userId) {
      setQuestions([]);
      setCheckins([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const since = addDays(today(), -HISTORY_WINDOW_DAYS);
      const [qRes, cRes] = await Promise.all([
        supabase
          .from('questions')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
        supabase
          .from('checkins')
          .select('*')
          .eq('user_id', userId)
          .gte('local_date', since)
          .order('local_date', { ascending: false }),
      ]);
      if (qRes.error) throw qRes.error;
      if (cRes.error) throw cRes.error;

      let loadedQuestions = qRes.data ?? [];
      // Safety net for accounts created before the sign-up trigger existed.
      if (loadedQuestions.length === 0) {
        const { data: seeded, error: seedError } = await supabase
          .from('questions')
          .insert(DEFAULT_QUESTIONS.map((q, i) => ({ ...q, user_id: userId, sort_order: i })))
          .select();
        if (seedError) throw seedError;
        loadedQuestions = seeded ?? [];
      }

      setQuestions(loadedQuestions);
      setCheckins(cRes.data ?? []);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const saveScore = useCallback(
    async (questionId: string, score: number, date: LocalDate = today()) => {
      if (!userId) return;
      const { data, error: upsertError } = await supabase
        .from('checkins')
        .upsert(
          { user_id: userId, question_id: questionId, local_date: date, score },
          { onConflict: 'user_id,question_id,local_date' },
        )
        .select()
        .single();
      if (upsertError) throw upsertError;
      setCheckins((prev) => {
        const rest = prev.filter(
          (c) => !(c.question_id === questionId && c.local_date === date),
        );
        return [data, ...rest];
      });
    },
    [userId],
  );

  const questions = useMemo(() => rawQuestions.map((q) => localizeQuestion(q, t)), [rawQuestions, t]);

  const updateQuestion = useCallback(
    async (id: string, requested: Partial<QuestionRow>) => {
      if (!userId) return;
      const previous = rawQuestions;
      let patch = requested;
      // Rewording a seeded question makes it the user's own: store the text they
      // were looking at (in their language) and stop following translations.
      const shown = questions.find((q) => q.id === id);
      if (shown?.default_key && ('title' in patch || 'score_labels' in patch)) {
        patch = { title: shown.title, score_labels: shown.score_labels, ...patch, default_key: null };
      }
      setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
      const { error: updateError } = await supabase
        .from('questions')
        .update(patch)
        .eq('id', id)
        .eq('user_id', userId);
      if (updateError) {
        setQuestions(previous);
        throw updateError;
      }
    },
    [userId, rawQuestions, questions],
  );

  const addQuestion = useCallback(async () => {
    if (!userId) return null;
    const { data, error: insertError } = await supabase
      .from('questions')
      .insert({
        user_id: userId,
        title: t('newQuestion.title'),
        icon: 'sun',
        score_labels: [t('newQuestion.score0'), t('newQuestion.score1'), t('newQuestion.score2')],
        reminder_time: '12:00',
        sort_order: Math.max(-1, ...rawQuestions.map((q) => q.sort_order)) + 1,
        is_active: true,
        reminder_next_day: false,
        default_key: null,
      })
      .select()
      .single();
    if (insertError) throw insertError;
    setQuestions((prev) => [...prev, data]);
    return data;
  }, [userId, rawQuestions, t]);

  const deleteQuestion = useCallback(
    async (id: string) => {
      if (!userId) return;
      const previous = rawQuestions;
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      // Soft delete: keeps historical check-ins meaningful instead of cascading them away.
      const { error: deleteError } = await supabase
        .from('questions')
        .update({ is_active: false })
        .eq('id', id)
        .eq('user_id', userId);
      if (deleteError) {
        setQuestions(previous);
        throw deleteError;
      }
    },
    [userId, rawQuestions],
  );

  const moveQuestion = useCallback(
    async (id: string, by: -1 | 1) => {
      if (!userId) return;
      const from = rawQuestions.findIndex((q) => q.id === id);
      const to = from + by;
      if (from < 0 || to < 0 || to >= rawQuestions.length) return;
      const previous = rawQuestions;
      const next = [...rawQuestions];
      [next[from], next[to]] = [next[to], next[from]];
      // Renumber everything, so older rows with equal sort_orders get untangled too.
      const renumbered = next.map((q, i) => ({ ...q, sort_order: i }));
      setQuestions(renumbered);
      const changed = renumbered.filter((q, i) => previous.find((p) => p.id === q.id)?.sort_order !== i);
      const results = await Promise.all(
        changed.map((q) =>
          supabase.from('questions').update({ sort_order: q.sort_order }).eq('id', q.id).eq('user_id', userId),
        ),
      );
      const failed = results.find((r) => r.error);
      if (failed) {
        setQuestions(previous);
        throw failed.error;
      }
    },
    [userId, rawQuestions],
  );

  const value = useMemo<DataValue>(
    () => ({
      questions,
      checkins,
      loading,
      error: loadError == null ? null : errorText(loadError, 'error.loadData'),
      reload,
      saveScore,
      updateQuestion,
      addQuestion,
      deleteQuestion,
      moveQuestion,
    }),
    [
      questions,
      checkins,
      loading,
      loadError,
      errorText,
      reload,
      saveScore,
      updateQuestion,
      addQuestion,
      deleteQuestion,
      moveQuestion,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside <DataProvider>');
  return ctx;
}
