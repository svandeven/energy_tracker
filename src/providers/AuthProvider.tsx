import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '../lib/supabase';
import { isSupabaseConfigured } from '../lib/env';
import type { ProfileRow } from '../lib/database.types';

export type OAuthProvider = 'google' | 'apple';

interface AuthValue {
  /** null once we know there is no session; undefined while still restoring. */
  session: Session | null | undefined;
  profile: ProfileRow | null;
  /** True until the persisted session has been read from storage. */
  initializing: boolean;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<{ needsConfirmation: boolean }>;
  signInWithProvider(provider: OAuthProvider): Promise<void>;
  signOut(): Promise<void>;
  setPushEnabled(enabled: boolean): Promise<void>;
  refreshProfile(): Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

/**
 * In Expo Go this resolves to an `exp://<lan-ip>:8081/--/auth-callback` URL; in a
 * dev or production build it uses the `energyscore` scheme. Both must be listed
 * under Supabase -> Authentication -> URL Configuration -> Redirect URLs.
 */
function oauthRedirectUri() {
  return AuthSession.makeRedirectUri({ path: 'auth-callback' });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setSession(null);
      return;
    }
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id ?? null;

  const refreshProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      return;
    }
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (data) {
      setProfile(data);
      return;
    }
    // The sign-up trigger normally creates this row. If the user predates the
    // trigger (or it failed), create it here so the app still has a name.
    const fallbackName =
      (session?.user?.user_metadata?.display_name as string | undefined) ??
      (session?.user?.user_metadata?.full_name as string | undefined) ??
      session?.user?.email?.split('@')[0] ??
      null;
    const { data: created } = await supabase
      .from('profiles')
      .upsert({ id: userId, display_name: fallbackName })
      .select()
      .maybeSingle();
    setProfile(created ?? null);
  }, [userId, session?.user]);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const trimmed = email.trim();
    const { data, error } = await supabase.auth.signUp({
      email: trimmed,
      password,
      options: {
        emailRedirectTo: oauthRedirectUri(),
        data: { display_name: trimmed.split('@')[0] },
      },
    });
    if (error) throw error;
    // With "Confirm email" on (the Supabase default) there is a user but no
    // session until the emailed link is opened.
    return { needsConfirmation: !data.session };
  }, []);

  const signInWithProvider = useCallback(async (provider: OAuthProvider) => {
    const redirectTo = oauthRedirectUri();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (!data?.url) throw new Error('Could not start sign-in.');

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success') return; // user dismissed the sheet

    const returned = new URL(result.url);
    // PKCE returns ?code=...; some providers put an error in the query too.
    const errorDescription = returned.searchParams.get('error_description');
    if (errorDescription) throw new Error(errorDescription);

    const code = returned.searchParams.get('code');
    if (!code) throw new Error('Sign-in did not return an authorization code.');

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) throw exchangeError;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const setPushEnabled = useCallback(
    async (enabled: boolean) => {
      if (!userId) return;
      setProfile((p) => (p ? { ...p, push_enabled: enabled } : p));
      const { error } = await supabase
        .from('profiles')
        .update({ push_enabled: enabled })
        .eq('id', userId);
      if (error) {
        setProfile((p) => (p ? { ...p, push_enabled: !enabled } : p));
        throw error;
      }
    },
    [userId],
  );

  const value = useMemo<AuthValue>(
    () => ({
      session,
      profile,
      initializing: session === undefined,
      signIn,
      signUp,
      signInWithProvider,
      signOut,
      setPushEnabled,
      refreshProfile,
    }),
    [session, profile, signIn, signUp, signInWithProvider, signOut, setPushEnabled, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
