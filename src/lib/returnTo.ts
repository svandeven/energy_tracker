import { Platform } from 'react-native';

/**
 * Where to go after signing in, when a signed-out visitor was bounced off a
 * page — e.g. the account deletion link the Play Store lists. On web it's kept
 * in sessionStorage, because Google and Apple sign-in leave the page and come
 * back through /auth-callback.
 */
const KEY = 'sunsteps.returnTo';
let pending: string | null = null;

const storage = () => (Platform.OS === 'web' && typeof sessionStorage !== 'undefined' ? sessionStorage : null);

export function rememberReturnTo(path: string) {
  // Only our own paths, and nothing worth coming back to on the dashboard.
  if (!path.startsWith('/') || path.startsWith('//') || path === '/') return;
  pending = path;
  try {
    storage()?.setItem(KEY, path);
  } catch {
    // Storage is a convenience; signing in still lands on the dashboard.
  }
}

/** The remembered path, once: reading it clears it. */
export function takeReturnTo(): string | null {
  let path = pending;
  try {
    path ??= storage()?.getItem(KEY) ?? null;
    storage()?.removeItem(KEY);
  } catch {
    // See above.
  }
  pending = null;
  return path;
}
