// The web build signs in with Google through the browser redirect instead.
export async function googleIdToken(): Promise<string | null> {
  throw new Error('Native Google sign-in is not available on web');
}

export async function googleSignOut() {}
