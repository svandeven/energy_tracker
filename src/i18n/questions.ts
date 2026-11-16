import type { QuestionRow } from '../lib/database.types';
import type { TranslationKey } from './en';

/** The five seeded questions, as stored in `questions.default_key`. */
export const DEFAULT_QUESTION_KEYS = ['morning', 'daytime', 'movement', 'evening', 'mood'] as const;
export type DefaultQuestionKey = (typeof DEFAULT_QUESTION_KEYS)[number];

type T = (key: TranslationKey) => string;

const asDefaultKey = (key: string | null): DefaultQuestionKey | null =>
  (DEFAULT_QUESTION_KEYS as readonly string[]).includes(key ?? '') ? (key as DefaultQuestionKey) : null;

/**
 * A seeded question the user hasn't reworded shows in the current language.
 * Anything they wrote themselves is shown exactly as written.
 */
export function localizeQuestion(question: QuestionRow, t: T): QuestionRow {
  const key = asDefaultKey(question.default_key);
  if (!key) return question;
  return {
    ...question,
    title: t(`question.${key}.title`),
    score_labels: [t(`question.${key}.score0`), t(`question.${key}.score1`), t(`question.${key}.score2`)],
  };
}

/** The History row abbreviation: translated for seeded questions, else the first word. */
export function shortLabel(question: QuestionRow, t: T): string {
  const key = asDefaultKey(question.default_key);
  if (key) return t(`question.${key}.short`);
  return question.title.split(/[\s&]+/)[0].slice(0, 4);
}
