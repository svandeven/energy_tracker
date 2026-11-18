import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from '../lib/env';

let configured = false;

/**
 * Signs in with the phone's own Google account picker and returns Google's ID
 * token for supabase.auth.signInWithIdToken, or null if the person backed out.
 * Unlike the browser flow, Google shows the app's name here rather than the
 * Supabase callback domain.
 */
export async function googleIdToken(): Promise<string | null> {
  if (!configured) {
    // The web client ID makes the token's audience the one Supabase checks.
    GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID, iosClientId: GOOGLE_IOS_CLIENT_ID });
    configured = true;
  }
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  try {
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return null;
    return response.data.idToken;
  } catch (e) {
    if (isErrorWithCode(e) && e.code === statusCodes.IN_PROGRESS) return null;
    throw e;
  }
}

/** Forgets the chosen account, so the next sign-in offers the picker again. */
export async function googleSignOut() {
  if (!configured) return;
  try {
    await GoogleSignin.signOut();
  } catch {
    // Not signed in with Google: nothing to forget.
  }
}
