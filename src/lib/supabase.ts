import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from './env';
import type { Database } from './database.types';

export const supabase = createClient<Database>(
  SUPABASE_URL || 'http://localhost',
  SUPABASE_ANON_KEY || 'anon',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // On web the recovery/magic link lands in the address bar, so let
      // supabase-js pick the session up itself. On native there is no URL bar —
      // the link arrives as a deep link and AuthProvider hands the code to
      // exchangeCodeForSession() instead.
      detectSessionInUrl: Platform.OS === 'web',
      flowType: 'pkce',
    },
  },
);

// supabase-js only knows to refresh tokens while a timer is alive. On native the
// JS timer is frozen in the background, so nudge it when the app comes forward.
if (isSupabaseConfigured && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
