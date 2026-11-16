import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocales, type Locale as DeviceLocale } from 'expo-localization';

import { supabase } from '../lib/supabase';
import { isSupabaseConfigured } from '../lib/env';
import { type LocalDate, daysAgo, parseLocalDate } from '../lib/dates';
import { en, type TranslationKey } from './en';
import { nl } from './nl';

export type { TranslationKey } from './en';

/** Adding a language: add it here, write its bundle, and widen the check in schema.sql. */
export const LOCALES = ['en', 'nl'] as const;
export type Locale = (typeof LOCALES)[number];

/** Each language named in itself, as a language picker should show it. */
export const LOCALE_NAMES: Record<Locale, string> = { en: 'English', nl: 'Nederlands' };

export const BUNDLED: Record<Locale, Record<TranslationKey, string>> = { en, nl };
export const TRANSLATION_KEYS = Object.keys(en) as TranslationKey[];

/** Editor overrides from the `translations` table, by locale then key. */
export type Overrides = Partial<Record<Locale, Partial<Record<string, string>>>>;

type Vars = Record<string, string | number>;

const PREFERENCE_KEY = 'fettle.language';
const CACHE_KEY = 'fettle.translations';

const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (LOCALES as readonly string[]).includes(value);

/** First device/browser language we support, else English. */
function pickDeviceLocale(locales: DeviceLocale[]): Locale {
  for (const l of locales) {
    if (isLocale(l.languageCode)) return l.languageCode;
  }
  return 'en';
}

const interpolate = (text: string, vars?: Vars) =>
  vars ? text.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m)) : text;

/**
 * Thrown by providers for errors the user will read, so the message can be
 * shown in the current language. `message` stays English for logs.
 */
export class LocalizedError extends Error {
  constructor(
    readonly key: TranslationKey,
    readonly vars?: Vars,
  ) {
    super(interpolate(en[key], vars));
  }
}

/** Supabase auth errors that people actually hit, mapped to our own wording. */
const KNOWN_SERVER_ERRORS: Record<string, TranslationKey> = {
  'Invalid login credentials': 'error.invalidCredentials',
  'User already registered': 'error.alreadyRegistered',
  'Email not confirmed': 'error.emailNotConfirmed',
};

interface I18nValue {
  locale: Locale;
  /** The user's explicit choice, or null to follow the device/browser. */
  preference: Locale | null;
  setPreference(next: Locale | null): void;
  t(key: TranslationKey, vars?: Vars): string;
  /** User-facing text for a caught error, falling back to `fallback`. */
  errorText(e: unknown, fallback: TranslationKey): string;
  overrides: Overrides;
  /** Applies a saved (or, with null, removed) override without a refetch. */
  applyOverride(key: string, locale: Locale, value: string | null): void;
  reloadOverrides(): Promise<void>;
  fmt: {
    /** "Tue, May 14" / "di 14 mei" */
    shortDate(date: LocalDate): string;
    /** "Tuesday, June 17, 2025" / "dinsdag 17 juni 2025" */
    longDate(date: LocalDate): string;
    /** "May 1" / "1 mei" */
    axisDate(date: LocalDate): string;
    /** "Today" / "Yesterday" / short date */
    dayLabel(date: LocalDate): string;
    /** Postgres time '08:00:00' -> "8:00 AM" / "08:00" */
    time(time: string): string;
  };
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const deviceLocales = useLocales();
  const [preference, setPreferenceState] = useState<Locale | null>(null);
  const [overrides, setOverrides] = useState<Overrides>({});
  const [ready, setReady] = useState(false);

  // Read the saved choice and the last-known overrides before the first
  // render, so a Dutch user never sees an English flash.
  useEffect(() => {
    void (async () => {
      try {
        const [pref, cached] = await Promise.all([
          AsyncStorage.getItem(PREFERENCE_KEY),
          AsyncStorage.getItem(CACHE_KEY),
        ]);
        if (isLocale(pref)) setPreferenceState(pref);
        if (cached) setOverrides(JSON.parse(cached) as Overrides);
      } catch {
        // Storage is a convenience; the bundled strings always work.
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const reloadOverrides = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { data, error } = await supabase.from('translations').select('key, locale, value');
    if (error || !data) return; // keep whatever we had; offline is fine
    const next: Overrides = {};
    for (const row of data) {
      if (!isLocale(row.locale)) continue;
      (next[row.locale] ??= {})[row.key] = row.value;
    }
    setOverrides(next);
    void AsyncStorage.setItem(CACHE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  useEffect(() => {
    void reloadOverrides();
  }, [reloadOverrides]);

  const applyOverride = useCallback((key: string, locale: Locale, value: string | null) => {
    setOverrides((prev) => {
      const forLocale = { ...prev[locale] };
      if (value == null) delete forLocale[key];
      else forLocale[key] = value;
      const next = { ...prev, [locale]: forLocale };
      void AsyncStorage.setItem(CACHE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const setPreference = useCallback((next: Locale | null) => {
    setPreferenceState(next);
    const write = next ? AsyncStorage.setItem(PREFERENCE_KEY, next) : AsyncStorage.removeItem(PREFERENCE_KEY);
    void write.catch(() => {});
  }, []);

  const locale = preference ?? pickDeviceLocale(deviceLocales);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const value = useMemo<I18nValue>(() => {
    const t = (key: TranslationKey, vars?: Vars) =>
      interpolate(overrides[locale]?.[key] ?? BUNDLED[locale][key] ?? en[key] ?? key, vars);

    const errorText = (e: unknown, fallback: TranslationKey) => {
      if (e instanceof LocalizedError) return t(e.key, e.vars);
      const message = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String(e.message) : '';
      const known = KNOWN_SERVER_ERRORS[message];
      if (known) return t(known);
      return message || t(fallback);
    };

    const date = (d: LocalDate, options: Intl.DateTimeFormatOptions) =>
      parseLocalDate(d).toLocaleDateString(locale, options);

    const fmt: I18nValue['fmt'] = {
      shortDate: (d) => date(d, { weekday: 'short', month: 'short', day: 'numeric' }),
      longDate: (d) => date(d, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
      axisDate: (d) => date(d, { month: 'short', day: 'numeric' }),
      dayLabel: (d) => {
        const ago = daysAgo(d);
        if (ago === 0) return t('history.today');
        if (ago === 1) return t('history.yesterday');
        return fmt.shortDate(d);
      },
      time: (time) => {
        const [h, m] = time.split(':').map(Number);
        return new Date(2000, 0, 1, h, m || 0).toLocaleTimeString(locale, {
          hour: 'numeric',
          minute: '2-digit',
        });
      },
    };

    return {
      locale,
      preference,
      setPreference,
      t,
      errorText,
      overrides,
      applyOverride,
      reloadOverrides,
      fmt,
    };
  }, [locale, preference, setPreference, overrides, applyOverride, reloadOverrides]);

  if (!ready) return null;
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
