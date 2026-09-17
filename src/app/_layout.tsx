import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

import { AuthProvider, useAuth } from '../providers/AuthProvider';
import { DataProvider } from '../providers/DataProvider';
import { useAppFonts } from '../theme/fonts';
import { isSupabaseConfigured } from '../lib/env';
import { SetupNotice } from '../components/SetupNotice';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const fontsReady = useAppFonts();

  useEffect(() => {
    if (fontsReady) void SplashScreen.hideAsync();
  }, [fontsReady]);

  if (!fontsReady) return null;

  // Without Supabase credentials there is nothing to sign in to, so show the
  // setup checklist instead of an auth screen that can only fail.
  if (!isSupabaseConfigured) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <SetupNotice />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AuthProvider>
        <DataProvider>
          <AuthGate />
        </DataProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

/** Bounces signed-out users to the welcome screen and signed-in users to the tabs. */
function AuthGate() {
  const { session, initializing, recovering } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;
    const inAuthFlow = segments[0] === '(auth)';

    // A recovery session is authenticated but still owes us a new password, so
    // it must not fall through to the normal "signed in -> dashboard" rule.
    if (recovering) {
      if (segments[1] !== 'reset-password') router.replace('/reset-password');
      return;
    }

    if (!session && !inAuthFlow) router.replace('/welcome');
    else if (session && inAuthFlow) router.replace('/');
  }, [session, initializing, recovering, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="check-in/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="summary" />
      <Stack.Screen name="change-password" options={{ presentation: 'card' }} />
    </Stack>
  );
}
