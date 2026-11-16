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
  /**
   * Reminded the morning after instead of the same day, and answered for the
   * day before — for questions best answered once the day is over (sleep, the
   * evening). Answering on the day itself is allowed but optional.
   */
  reminder_next_day: boolean;
  sort_order: number;
  is_active: boolean;
  /**
   * Set while this is one of the five seeded questions with untouched wording
   * ('morning', 'daytime', 'movement', 'evening', 'mood'). The app then shows
   * the translated text for the current language instead of `title` and
   * `score_labels`. Cleared as soon as the user rewrites the question.
   */
  default_key: string | null;
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
  /** Only a super admin can change this; a trigger in schema.sql enforces it. */
  role: UserRole;
  /** When to remind the user to set today's goals ('HH:MM:SS'). */
  goal_plan_time: string;
  /** When to remind the user to tick off what they got done ('HH:MM:SS'). */
  goal_review_time: string;
  created_at: string;
};

export type GoalRepeat = 'none' | 'daily' | 'weekdays';

/**
 * A goal the user keeps: repeating ones ('daily', 'weekdays') are copied onto
 * each day they apply to; 'none' is a saved goal to pick again by hand.
 */
export type GoalTemplateRow = {
  id: string;
  user_id: string;
  title: string;
  repeat: GoalRepeat;
  /** Reminder time with a Done button, or null for no reminder. */
  remind_at: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

/** One goal on one local day. */
export type GoalRow = {
  id: string;
  user_id: string;
  local_date: string;
  template_id: string | null;
  title: string;
  remind_at: string | null;
  /** Set when ticked off. */
  done_at: string | null;
  /** Removed for this day only (keeps a repeating goal from being re-added). */
  hidden: boolean;
  sort_order: number;
  created_at: string;
};

/** What `goal_day_stats()` returns: one row per day that had goals. */
export type GoalDayStat = { local_date: string; total: number; done: number };

export type UserRole = 'user' | 'content_editor' | 'super_admin';

/** An editor's override of one bundled string in one locale. */
export type TranslationRow = {
  key: string;
  locale: string;
  value: string;
  updated_at: string;
  updated_by: string | null;
};

/** What `admin_list_users()` returns to a super admin. */
export type AdminUserRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  role: UserRole;
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
      goal_templates: {
        Row: GoalTemplateRow;
        Insert: Omit<GoalTemplateRow, 'id' | 'created_at' | 'is_active' | 'sort_order'> &
          Partial<Pick<GoalTemplateRow, 'id' | 'is_active' | 'sort_order'>>;
        Update: Partial<GoalTemplateRow>;
        Relationships: [];
      };
      goals: {
        Row: GoalRow;
        Insert: Omit<GoalRow, 'id' | 'created_at' | 'hidden' | 'done_at' | 'sort_order'> &
          Partial<Pick<GoalRow, 'id' | 'hidden' | 'done_at' | 'sort_order'>>;
        Update: Partial<GoalRow>;
        Relationships: [];
      };
      translations: {
        Row: TranslationRow;
        Insert: Pick<TranslationRow, 'key' | 'locale' | 'value'> & Partial<TranslationRow>;
        Update: Partial<TranslationRow>;
        Relationships: [];
      };
    };
    // `Record<never, never>` (not `Record<string, never>`) so that `keyof Views`
    // is empty — otherwise every table name also matches supabase-js's view
    // overload of `.from()` and insert/update types collapse to `never`.
    Views: Record<never, never>;
    Functions: {
      delete_account: { Args: Record<string, never>; Returns: undefined };
      admin_list_users: { Args: Record<string, never>; Returns: AdminUserRow[] };
      admin_set_role: { Args: { target: string; new_role: UserRole }; Returns: undefined };
      goal_day_stats: { Args: Record<string, never>; Returns: GoalDayStat[] };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
