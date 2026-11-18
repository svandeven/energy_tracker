import type { AppleToken } from './appleSignIn.ios';

// Native Sign in with Apple only exists on iOS; Android and web use the
// browser flow instead.
export const appleIdToken: (() => Promise<AppleToken | null>) | null = null;
