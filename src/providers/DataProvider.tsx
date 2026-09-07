import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { CheckinRow, QuestionRow } from '../lib/database.types';
import { type LocalDate, addDays, today } from '../lib/dates';
import { useAuth } from './AuthProvider';
import { DEFAULT_QUESTIONS } from '../features/defaultQuestions';

/** The chart needs 30 days and the week-over-week delta needs 14; fetch a little more. */
const HISTORY_WINDOW_DAYS = 45;

interface DataValue {
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
}

const DataContext = createContext<DataValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [checkins, setCheckins] = useState<CheckinRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setError(e instanceof Error ? e.message : 'Could not load your data.');
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

  const updateQuestion = useCallback(
    async (id: string, patch: Partial<QuestionRow>) => {
      if (!userId) return;
      const previous = questions;
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
    [userId, questions],
  );

  const addQuestion = useCallback(async () => {
    if (!userId) return null;
    const { data, error: insertError } = await supabase
      .from('questions')
      .insert({
        user_id: userId,
        title: 'New check-in',
        icon: 'sun',
        score_labels: ['Low', 'Okay', 'Great'],
        reminder_time: '12:00',
        sort_order: questions.length,
        is_active: true,
      })
      .select()
      .single();
    if (insertError) throw insertError;
    setQuestions((prev) => [...prev, data]);
    return data;
  }, [userId, questions.length]);

  const deleteQuestion = useCallback(
    async (id: string) => {
      if (!userId) return;
      const previous = questions;
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
    [userId, questions],
  );

  const value = useMemo<DataValue>(
    () => ({
      questions,
      checkins,
      loading,
      error,
      reload,
      saveScore,
      updateQuestion,
      addQuestion,
      deleteQuestion,
    }),
    [questions, checkins, loading, error, reload, saveScore, updateQuestion, addQuestion, deleteQuestion],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside <DataProvider>');
  return ctx;
}
