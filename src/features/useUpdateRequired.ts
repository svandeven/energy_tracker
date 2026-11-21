import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';

import type { Locale } from '../i18n';

/**
 * Lets an old app be switched off from outside: public/app-config.json on
 * sunsteps.eu names the oldest version still allowed, plus an optional
 * message. It's served by the web app's Worker rather than Supabase, so it
 * keeps working if the backend moves. Change it and run `npm run deploy:web`.
 */
const CONFIG_URL = 'https://sunsteps.eu/app-config.json';
const CACHE_KEY = 'sunsteps.appConfig';

interface AppConfig {
  minimumVersion?: Partial<Record<'ios' | 'android', string>>;
  message?: Partial<Record<Locale, string | null>>;
}

export interface UpdateRequired {
  /** The message for this language from the config, if there is one. */
  message: string | null;
}

/** Compares dotted version numbers: negative if a is older than b. */
function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function check(config: AppConfig, locale: Locale): UpdateRequired | null {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return null;
  const minimum = config.minimumVersion?.[Platform.OS];
  const installed = Application.nativeApplicationVersion;
  if (!minimum || !installed || compareVersions(installed, minimum) >= 0) return null;
  return { message: config.message?.[locale] ?? null };
}

/**
 * Null while this version is still allowed. Checked at launch and whenever the
 * app comes back to the foreground. The last config is kept, so an app that's
 * been switched off stays off offline; with no config at all it stays open.
 */
export function useUpdateRequired(locale: Locale): UpdateRequired | null {
  const [config, setConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let cancelled = false;

    AsyncStorage.getItem(CACHE_KEY)
      .then((cached) => {
        if (cached && !cancelled) setConfig((current) => current ?? JSON.parse(cached));
      })
      .catch(() => {});

    const refresh = async () => {
      try {
        const res = await fetch(`${CONFIG_URL}?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const next: AppConfig = await res.json();
        if (cancelled) return;
        setConfig(next);
        void AsyncStorage.setItem(CACHE_KEY, JSON.stringify(next)).catch(() => {});
      } catch {
        // Offline or the site is down: keep what we had.
      }
    };

    void refresh();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  return config ? check(config, locale) : null;
}
