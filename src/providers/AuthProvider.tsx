import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';
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
  /** Emails a recovery link and a 6-digit code. */
  requestPasswordReset(email: string): Promise<void>;
  /**
   * Accepts either the 6-digit code or the whole recovery link pasted out of
   * the email. Supabase's default template only contains the link, so pasting
   * it has to work without the user editing any email templates.
   */
  verifyRecovery(email: string, codeOrLink: string): Promise<void>;
  /** Sets a new password for the currently authenticated user. */
  updatePassword(password: string): Promise<void>;
  /**
   * Changes the password for a signed-in user, verifying the current one first.
   * `updateUser` alone does not require the old password, so without the
   * re-auth step anyone holding an unlocked phone could take over the account.
   */
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
  /** 'email' for password accounts, otherwise the OAuth provider that owns it. */
  authProvider: string;
  /**
   * True while the user holds a recovery session and still owes us a new
   * password. Tracked explicitly rather than read off an auth event: the PKCE
   * code exchange reports a plain sign-in, so there is no reliable
   * "PASSWORD_RECOVERY" signal to key off.
   */
  recovering: boolean;
  endRecovery(): void;
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

/** Where the emailed password-recovery link should land. */
function recoveryRedirectUri() {
  return AuthSession.makeRedirectUri({ path: 'reset-password' });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setSession(null);
      return;
    }
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next ?? null);
      // On web, supabase-js detects the recovery link in the address bar itself
      // and reports it here — this is the only place that signal arrives.
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Recovery (and OAuth) links come back into the app as a deep link carrying a
  // PKCE `code`. Exchange it for a session here; if the link was the
  // reset-password one, remember that a new password is still owed.
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const handleUrl = async (url: string | null) => {
      if (!url) return;
      let parsed: Linking.ParsedURL;
      try {
        parsed = Linking.parse(url);
      } catch {
        return;
      }
      const code = parsed.queryParams?.code;
      const isRecovery =
        (parsed.path ?? '').includes('reset-password') ||
        parsed.queryParams?.type === 'recovery';
      if (typeof code !== 'string') return;

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error && isRecovery) setRecovering(true);
    };

    // Cold start: the link that launched the app.
    void Linking.getInitialURL().then(handleUrl);
    // Warm start: app already running.
    const sub = Linking.addEventListener('url', ({ url }) => void handleUrl(url));
    return () => sub.remove();
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

  const requestPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: recoveryRedirectUri(),
    });
    if (error) throw error;
  }, []);

  const verifyRecovery = useCallback(async (email: string, codeOrLink: string) => {
    const input = codeOrLink.trim();

    // A pasted link. Supabase's own verify URL carries ?token=<hash>; a link
    // that has already bounced through a redirect may carry ?code= instead.
    if (input.includes('://')) {
      let url: URL;
      try {
        url = new URL(input);
      } catch {
        throw new Error("That doesn't look like a link from the email.");
      }

      const code = url.searchParams.get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
        setRecovering(true);
        return;
      }

      const tokenHash = url.searchParams.get('token') ?? url.searchParams.get('token_hash');
      if (!tokenHash) {
        throw new Error(
          "Couldn't find a token in that link. Copy the whole link from the email.",
        );
      }
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'recovery',
      });
      if (error) throw error;
      setRecovering(true);
      return;
    }

    // A 6-digit code, which only appears if {{ .Token }} was added to the
    // Reset Password email template.
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: input,
      type: 'recovery',
    });
    if (error) throw error;
    setRecovering(true);
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    setRecovering(false);
  }, []);

  const endRecovery = useCallback(() => setRecovering(false), []);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      const email = session?.user?.email;
      if (!email) throw new Error('This account has no email address.');

      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (reauthError) throw new Error('That current password is not correct.');

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
    [session?.user?.email],
  );

  // Google/Apple accounts have no password to change.
  const authProvider =
    (session?.user?.app_metadata?.provider as string | undefined) ?? 'email';

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRecovering(false);
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
      requestPasswordReset,
      verifyRecovery,
      updatePassword,
      changePassword,
      authProvider,
      recovering,
      endRecovery,
    }),
    [
      session,
      profile,
      signIn,
      signUp,
      signInWithProvider,
      signOut,
      setPushEnabled,
      refreshProfile,
      requestPasswordReset,
      verifyRecovery,
      updatePassword,
      changePassword,
      authProvider,
      recovering,
      endRecovery,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
