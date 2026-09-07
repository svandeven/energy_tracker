import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AntDesign, Ionicons } from '@expo/vector-icons';

import { Button } from '../../components/Button';
import { Text } from '../../components/Text';
import { colors, fonts, radii } from '../../theme';
import { useAuth, type OAuthProvider } from '../../providers/AuthProvider';

type Mode = 'login' | 'signup';

export default function SignInScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const { signIn, signUp, signInWithProvider } = useAuth();

  const [mode, setMode] = useState<Mode>(params.mode === 'login' ? 'login' : 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState<'email' | OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
    setConfirm('');
  };

  const validate = (): string | null => {
    if (!email.trim()) return 'Enter your email address.';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return 'That email address looks incomplete.';
    if (password.length < 6) return 'Passwords need at least 6 characters.';
    if (mode === 'signup' && password !== confirm) return 'Those passwords don’t match.';
    return null;
  };

  const submit = async () => {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setNotice(null);
    setBusy('email');
    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else {
        const { needsConfirmation } = await signUp(email, password);
        if (needsConfirmation) {
          setNotice(`Check ${email.trim()} for a confirmation link, then come back and log in.`);
          setMode('login');
        }
      }
      // On success the auth gate in _layout.tsx navigates for us.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(null);
    }
  };

  const oauth = async (provider: OAuthProvider) => {
    setError(null);
    setNotice(null);
    setBusy(provider);
    try {
      await signInWithProvider(provider);
    } catch (e) {
      setError(e instanceof Error ? e.message : `Could not continue with ${provider}.`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logo}>
            <Ionicons name="flash" size={30} color={colors.ink} />
          </View>
          <Text variant="title" center>
            Energy Score
          </Text>
          <Text variant="small" color={colors.inkMuted} center style={styles.tagline}>
            Track your daily energy, calmly.
          </Text>

          <View style={styles.segmented}>
            <SegmentedTab
              label="Log in"
              active={mode === 'login'}
              onPress={() => switchMode('login')}
            />
            <SegmentedTab
              label="Create account"
              active={mode === 'signup'}
              onPress={() => switchMode('signup')}
            />
          </View>

          <Field label="Email">
            <Ionicons name="mail-outline" size={18} color={colors.inkFaint} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.inkFaint}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              style={styles.input}
            />
          </Field>

          <Field label="Password">
            <Ionicons name="lock-closed-outline" size={18} color={colors.inkFaint} />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor={colors.inkFaint}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              style={styles.input}
            />
            <Pressable
              hitSlop={10}
              onPress={() => setShowPassword((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={colors.inkFaint}
              />
            </Pressable>
          </Field>

          {mode === 'signup' && (
            <Field label="Confirm password">
              <Ionicons name="lock-closed-outline" size={18} color={colors.inkFaint} />
              <TextInput
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Re-enter your password"
                placeholderTextColor={colors.inkFaint}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
                autoComplete="new-password"
                style={styles.input}
              />
              <Pressable
                hitSlop={10}
                onPress={() => setShowConfirm((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={showConfirm ? 'Hide password' : 'Show password'}
              >
                <Ionicons
                  name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={colors.inkFaint}
                />
              </Pressable>
            </Field>
          )}

          {error && (
            <Text variant="small" color="#C4342B" style={styles.message}>
              {error}
            </Text>
          )}
          {notice && (
            <Text variant="small" color={colors.onMint} style={[styles.message, styles.noticeBox]}>
              {notice}
            </Text>
          )}

          <Button
            label="Continue"
            onPress={submit}
            loading={busy === 'email'}
            disabled={busy !== null && busy !== 'email'}
            style={styles.continue}
          />

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text variant="caption" color={colors.inkFaint}>
              or continue with
            </Text>
            <View style={styles.dividerLine} />
          </View>

          <Button
            label="Continue with Apple"
            variant="secondary"
            icon={<AntDesign name="apple" size={18} color={colors.ink} />}
            loading={busy === 'apple'}
            disabled={busy !== null && busy !== 'apple'}
            onPress={() => oauth('apple')}
          />
          <Button
            label="Continue with Google"
            variant="secondary"
            icon={<AntDesign name="google" size={18} color={colors.ink} />}
            loading={busy === 'google'}
            disabled={busy !== null && busy !== 'google'}
            onPress={() => oauth('google')}
            style={styles.googleButton}
          />

          <Text variant="caption" color={colors.inkFaint} center style={styles.terms}>
            By continuing you agree to our Terms &amp; Privacy Policy.
          </Text>

          <Pressable onPress={() => router.replace('/welcome')} style={styles.backLink}>
            <Text variant="smallStrong" color={colors.teal} center>
              Back to welcome
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SegmentedTab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      style={[styles.tab, active && styles.tabActive]}
    >
      <Text variant={active ? 'bodyStrong' : 'body'} color={active ? colors.ink : colors.inkMuted}>
        {label}
      </Text>
    </Pressable>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text variant="label">{label}</Text>
      <View style={styles.inputRow}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 },
  logo: {
    alignSelf: 'center',
    width: 58,
    height: 58,
    borderRadius: radii.md,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  tagline: { marginTop: 4, marginBottom: 26 },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 4,
    marginBottom: 22,
  },
  tab: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 11 },
  tabActive: { backgroundColor: colors.white },
  field: { marginBottom: 16, gap: 8 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    backgroundColor: colors.white,
  },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  message: { marginBottom: 12 },
  noticeBox: {
    backgroundColor: colors.mint,
    borderRadius: radii.sm,
    padding: 12,
    overflow: 'hidden',
  },
  continue: { marginTop: 4 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 22 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  googleButton: { marginTop: 12 },
  terms: { marginTop: 22 },
  backLink: { marginTop: 14, paddingVertical: 6 },
});
