import { useEffect } from 'react';
import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

import { I18nProvider } from '../i18n';
import { AuthProvider, useAuth } from '../providers/AuthProvider';
import { DataProvider } from '../providers/DataProvider';
import { GoalsProvider } from '../providers/GoalsProvider';
import { useAppFonts } from '../theme/fonts';
import { isSupabaseConfigured } from '../lib/env';
import { SetupNotice } from '../components/SetupNotice';
import { useNotificationResponses } from '../features/useNotificationResponses';

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
      <I18nProvider>
        <AuthProvider>
          <DataProvider>
            <GoalsProvider>
              <AuthGate />
            </GoalsProvider>
          </DataProvider>
        </AuthProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}

/** Bounces signed-out users to the welcome screen and signed-in users to the tabs. */
function AuthGate() {
  const { session, initializing, recovering } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navigationReady = useRootNavigationState()?.key != null;

  // Done buttons and taps on reminders. Lives here rather than in the tabs so
  // it's mounted whichever screen is open, and waits until a tap can actually
  // land: navigator up, signed in, and not about to be bounced off an auth screen.
  useNotificationResponses(
    navigationReady && !initializing && !recovering && session != null && segments[0] !== '(auth)',
  );

  useEffect(() => {
    if (initializing) return;
    const inAuthFlow = segments[0] === '(auth)';
    // Terms are linked from the sign-in screen, so they must open either way.
    // The sign-in callback has no session yet while the code is exchanged, and
    // navigates on by itself once it does.
    const isPublic = segments[0] === 'terms' || segments[0] === 'auth-callback';

    // A recovery session is authenticated but still owes us a new password, so
    // it must not fall through to the normal "signed in -> dashboard" rule.
    if (recovering) {
      if (segments[1] !== 'reset-password') router.replace('/reset-password');
      return;
    }

    if (isPublic) return;
    if (!session && !inAuthFlow) router.replace('/welcome');
    else if (session && inAuthFlow) router.replace('/');
  }, [session, initializing, recovering, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="check-in/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="summary" />
      <Stack.Screen name="goal/new" options={{ presentation: 'card' }} />
      <Stack.Screen name="reminders" options={{ presentation: 'card' }} />
      <Stack.Screen name="profile" options={{ presentation: 'card' }} />
      <Stack.Screen name="questions" options={{ presentation: 'card' }} />
      <Stack.Screen name="change-password" options={{ presentation: 'card' }} />
      <Stack.Screen name="delete-account" options={{ presentation: 'card' }} />
      <Stack.Screen name="terms" options={{ presentation: 'card' }} />
      <Stack.Screen name="admin" />
      <Stack.Screen name="auth-callback" />
    </Stack>
  );
}
