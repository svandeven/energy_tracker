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
      // There is no URL bar in a native app; we hand the OAuth code to
      // exchangeCodeForSession() ourselves in AuthProvider.
      detectSessionInUrl: false,
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
