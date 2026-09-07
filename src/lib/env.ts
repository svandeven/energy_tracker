/**
 * Supabase config comes from .env (see .env.example).
 * EXPO_PUBLIC_* vars are inlined into the JS bundle at build time — that is
 * correct and expected for these two values: the anon key is a *publishable*
 * key whose access is bounded by row-level security, not a secret.
 * Never put the service_role key here.
 */
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** Placeholder values from .env.example count as "not configured". */
const PLACEHOLDERS = ['https://your-project-ref.supabase.co', 'your-anon-key'];

export const isSupabaseConfigured =
  Boolean(SUPABASE_URL && SUPABASE_ANON_KEY) &&
  !PLACEHOLDERS.includes(SUPABASE_URL) &&
  !PLACEHOLDERS.includes(SUPABASE_ANON_KEY);
