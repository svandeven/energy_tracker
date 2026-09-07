/**
 * Hand-written to match supabase/schema.sql.
 *
 * These are `type` aliases rather than `interface`s on purpose: supabase-js
 * checks each table against `Record<string, unknown>`, and only object literal
 * types get the implicit index signature that check needs. Declaring them as
 * interfaces silently degrades every insert/update parameter to `never`.
 */

export type QuestionIcon = 'sun' | 'battery' | 'run' | 'moon' | 'brain';

export type QuestionRow = {
  id: string;
  user_id: string;
  title: string;
  icon: string;
  /** Exactly 3 entries: descriptions for scores 0, 1 and 2. */
  score_labels: string[];
  /** 'HH:MM:SS' as returned by Postgres `time`. */
  reminder_time: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type CheckinRow = {
  id: string;
  user_id: string;
  question_id: string;
  /** 'YYYY-MM-DD' in the user's own timezone. */
  local_date: string;
  score: number;
  created_at: string;
  updated_at: string;
};

export type ProfileRow = {
  id: string;
  display_name: string | null;
  push_enabled: boolean;
  created_at: string;
};

/**
 * Shaped for supabase-js's `GenericSchema`, which is why each table carries an
 * (empty) `Relationships` tuple — we never traverse foreign keys in a select.
 */
export type Database = {
  __InternalSupabase: { PostgrestVersion: '12' };
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { id: string };
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      questions: {
        Row: QuestionRow;
        Insert: Omit<QuestionRow, 'id' | 'created_at'> & { id?: string };
        Update: Partial<QuestionRow>;
        Relationships: [];
      };
      checkins: {
        Row: CheckinRow;
        Insert: Omit<CheckinRow, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<CheckinRow>;
        Relationships: [];
      };
    };
    // `Record<never, never>` (not `Record<string, never>`) so that `keyof Views`
    // is empty — otherwise every table name also matches supabase-js's view
    // overload of `.from()` and insert/update types collapse to `never`.
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
