import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '../lib/supabase';
import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID, isSupabaseConfigured } from '../lib/env';
import { cancelReminders } from '../features/notifications';
import { removeAvatars, uploadAvatar } from '../features/avatar';
import { appleIdToken } from '../features/appleSignIn';
import { googleIdToken, googleSignOut } from '../features/googleSignIn';
import type { ProfileRow } from '../lib/database.types';
import { LocalizedError, useI18n } from '../i18n';

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
  setDisplayName(name: string): Promise<void>;
  /** Uploads a new profile picture (JPEG as base64), or removes it with null. */
  setAvatar(base64: string | null): Promise<void>;
  /** Saves the daily goal-planning and goal-review reminder times. */
  setGoalTimes(patch: Partial<Pick<ProfileRow, 'goal_plan_time' | 'goal_review_time'>>): Promise<void>;
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
  /**
   * Permanently deletes the signed-in user and, by cascade, every row they own.
   * Password accounts must re-enter their password first, for the same
   * unlocked-phone reason as `changePassword`.
   */
  deleteAccount(currentPassword?: string): Promise<void>;
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
 * dev or production build it uses the `sunsteps` scheme. Both must be listed
 * under Supabase -> Authentication -> URL Configuration -> Redirect URLs.
 */
function oauthRedirectUri() {
  return AuthSession.makeRedirectUri({ path: 'auth-callback' });
}

/**
 * Where the sign-up confirmation link lands. On native that's a page on the
 * website rather than a sunsteps:// link, which mail apps and other devices
 * can't open and show as a blank page; it offers to hand the code to the app.
 * Must be listed under Supabase -> Authentication -> URL Configuration ->
 * Redirect URLs.
 */
function confirmationRedirectUri() {
  return Platform.OS === 'web' ? oauthRedirectUri() : 'https://sunsteps.eu/email-confirmed';
}

/** Where the emailed password-recovery link should land. */
function recoveryRedirectUri() {
  return AuthSession.makeRedirectUri({ path: 'reset-password' });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { locale } = useI18n();
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
        emailRedirectTo: confirmationRedirectUri(),
        // `locale` picks the language of the emails (see supabase/templates).
        data: { display_name: trimmed.split('@')[0], locale },
      },
    });
    if (error) throw error;
    // With "Confirm email" on (the Supabase default) there is a user but no
    // session until the emailed link is opened.
    return { needsConfirmation: !data.session };
  }, [locale]);

  const signInWithProvider = useCallback(async (provider: OAuthProvider) => {
    const redirectTo = oauthRedirectUri();

    // On web, navigate the whole tab and let supabase-js pick the code up out of
    // the address bar on the way back (`detectSessionInUrl`). The popup variant
    // below cannot work here: completing it requires the redirect page to call
    // WebBrowser.maybeCompleteAuthSession(), and the page we land on is a plain
    // route with no opener to post back to once the tab has been replaced.
    if (Platform.OS === 'web') {
      const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
      if (error) throw error;
      return; // the tab is already on its way to the provider
    }

    // Apple on iOS: the system Sign in with Apple sheet, as App Review expects.
    if (provider === 'apple' && appleIdToken) {
      const apple = await appleIdToken();
      if (!apple) return; // sheet dismissed
      const { error } = await supabase.auth.signInWithIdToken({ provider: 'apple', ...apple });
      if (error) throw error;
      return;
    }

    // Google on a phone: the native account picker, then hand Google's token
    // to Supabase. No browser, so Google names the app, not the Supabase domain.
    // iOS also needs its own client ID.
    if (provider === 'google' && GOOGLE_WEB_CLIENT_ID && (Platform.OS !== 'ios' || GOOGLE_IOS_CLIENT_ID)) {
      const token = await googleIdToken();
      if (!token) return; // picker dismissed
      const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token });
      if (error) throw error;
      return;
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (!data?.url) throw new LocalizedError('error.couldNotStartSignIn');

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success') return; // user dismissed the sheet

    const returned = new URL(result.url);
    // PKCE returns ?code=...; some providers put an error in the query too.
    const errorDescription = returned.searchParams.get('error_description');
    if (errorDescription) throw new Error(errorDescription);

    const code = returned.searchParams.get('code');
    if (!code) throw new LocalizedError('error.noAuthCode');

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
        throw new LocalizedError('error.notALink');
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
        throw new LocalizedError('error.noTokenInLink');
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
      if (!email) throw new LocalizedError('error.noEmailOnAccount');

      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (reauthError) throw new LocalizedError('error.currentPasswordWrong');

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
    await googleSignOut();
    setProfile(null);
    setRecovering(false);
  }, []);

  const deleteAccount = useCallback(
    async (currentPassword?: string) => {
      if (authProvider === 'email') {
        const email = session?.user?.email;
        if (!email || !currentPassword) throw new LocalizedError('error.passwordRequired');
        const { error: reauthError } = await supabase.auth.signInWithPassword({
          email,
          password: currentPassword,
        });
        if (reauthError) throw new LocalizedError('error.passwordWrong');
      }

      // Storage files don't cascade with the account, so remove them first.
      if (userId) await removeAvatars(userId).catch(() => {});

      const { error } = await supabase.rpc('delete_account');
      if (error) throw error;

      // The user no longer exists, so the server-side sign-out would only fail;
      // clearing the local session is what sends the auth gate back to welcome.
      await cancelReminders();
      await supabase.auth.signOut({ scope: 'local' });
      setProfile(null);
      setRecovering(false);
    },
    [authProvider, session?.user?.email, userId],
  );

  const setDisplayName = useCallback(
    async (name: string) => {
      if (!userId) return;
      const display_name = name.trim();
      const { error } = await supabase.from('profiles').update({ display_name }).eq('id', userId);
      if (error) throw error;
      setProfile((p) => (p ? { ...p, display_name } : p));
    },
    [userId],
  );

  const setAvatar = useCallback(
    async (base64: string | null) => {
      if (!userId) return;
      const avatar_url = base64 ? await uploadAvatar(userId, base64) : null;
      const { error } = await supabase.from('profiles').update({ avatar_url }).eq('id', userId);
      if (error) throw error;
      setProfile((p) => (p ? { ...p, avatar_url } : p));
      // Tidy up older pictures; a failure here only leaves an unused file.
      await removeAvatars(userId, avatar_url).catch(() => {});
    },
    [userId],
  );

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

  const setGoalTimes = useCallback(
    async (patch: Partial<Pick<ProfileRow, 'goal_plan_time' | 'goal_review_time'>>) => {
      if (!userId) return;
      const previous = profile;
      setProfile((p) => (p ? { ...p, ...patch } : p));
      const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
      if (error) {
        setProfile(previous);
        throw error;
      }
    },
    [userId, profile],
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
      setDisplayName,
      setAvatar,
      setGoalTimes,
      refreshProfile,
      requestPasswordReset,
      verifyRecovery,
      updatePassword,
      changePassword,
      deleteAccount,
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
      setDisplayName,
      setAvatar,
      setGoalTimes,
      refreshProfile,
      requestPasswordReset,
      verifyRecovery,
      updatePassword,
      changePassword,
      deleteAccount,
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
