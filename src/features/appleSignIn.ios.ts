import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';

export interface AppleToken {
  token: string;
  /** The raw nonce; Apple only saw its SHA-256 hash. */
  nonce: string;
}

/**
 * Native Sign in with Apple for supabase.auth.signInWithIdToken, or null if
 * the person closed the sheet. The nonce ties the token to this request.
 */
export const appleIdToken = async (): Promise<AppleToken | null> => {
  const nonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce);
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
    if (!credential.identityToken) return null;
    return { token: credential.identityToken, nonce };
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return null;
    throw e;
  }
};
