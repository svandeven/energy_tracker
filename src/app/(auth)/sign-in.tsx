import { useState } from 'react';
import {
  Image,
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
import { useI18n } from '../../i18n';

type Mode = 'login' | 'signup';

export default function SignInScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const { signIn, signUp, signInWithProvider } = useAuth();
  const { t, errorText } = useI18n();

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
    if (!email.trim()) return t('error.emailRequired');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return t('error.emailIncomplete');
    if (password.length < 6) return t('error.passwordTooShort');
    if (mode === 'signup' && password !== confirm) return t('error.passwordsDontMatch');
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
          setNotice(t('signIn.checkEmail', { email: email.trim() }));
          setMode('login');
        }
      }
      // On success the auth gate in _layout.tsx navigates for us.
    } catch (e) {
      setError(errorText(e, 'common.tryAgain'));
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
      setError(
        e instanceof Error && e.message
          ? errorText(e, 'common.tryAgain')
          : t('error.oauthFailed', { provider: provider === 'apple' ? 'Apple' : 'Google' }),
      );
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
          <Image
            source={require('../../../assets/images/logo.png')}
            style={styles.logo}
            accessibilityIgnoresInvertColors
          />
          <Text variant="title" center>
            {t('common.appName')}
          </Text>
          <Text variant="small" color={colors.inkMuted} center style={styles.tagline}>
            {t('signIn.tagline')}
          </Text>

          <View style={styles.segmented}>
            <SegmentedTab
              label={t('signIn.tabLogin')}
              active={mode === 'login'}
              onPress={() => switchMode('login')}
            />
            <SegmentedTab
              label={t('signIn.tabSignup')}
              active={mode === 'signup'}
              onPress={() => switchMode('signup')}
            />
          </View>

          <Field label={t('common.email')}>
            <Ionicons name="mail-outline" size={18} color={colors.inkFaint} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder={t('common.emailPlaceholder')}
              placeholderTextColor={colors.inkFaint}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              style={styles.input}
            />
          </Field>

          <Field label={t('common.password')}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.inkFaint} />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder={t('signIn.passwordPlaceholder')}
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
              accessibilityLabel={showPassword ? t('common.hidePassword') : t('common.showPassword')}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={colors.inkFaint}
              />
            </Pressable>
          </Field>

          {mode === 'signup' && (
            <Field label={t('signIn.confirmPassword')}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.inkFaint} />
              <TextInput
                value={confirm}
                onChangeText={setConfirm}
                placeholder={t('common.reenterPassword')}
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
                accessibilityLabel={showConfirm ? t('common.hidePassword') : t('common.showPassword')}
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
            <Text variant="small" color={colors.onTint} style={[styles.message, styles.noticeBox]}>
              {notice}
            </Text>
          )}

          {mode === 'login' && (
            <Pressable
              onPress={() => router.push('/forgot-password')}
              style={styles.forgotLink}
              hitSlop={6}
            >
              <Text variant="smallStrong" color={colors.accent}>
                {t('signIn.forgot')}
              </Text>
            </Pressable>
          )}

          <Button
            label={t('common.continue')}
            onPress={submit}
            loading={busy === 'email'}
            disabled={busy !== null && busy !== 'email'}
            style={styles.continue}
          />

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text variant="caption" color={colors.inkFaint}>
              {t('signIn.orContinueWith')}
            </Text>
            <View style={styles.dividerLine} />
          </View>

          <Button
            label={t('signIn.apple')}
            variant="secondary"
            icon={<AntDesign name="apple" size={18} color={colors.ink} />}
            loading={busy === 'apple'}
            disabled={busy !== null && busy !== 'apple'}
            onPress={() => oauth('apple')}
          />
          <Button
            label={t('signIn.google')}
            variant="secondary"
            icon={<AntDesign name="google" size={18} color={colors.ink} />}
            loading={busy === 'google'}
            disabled={busy !== null && busy !== 'google'}
            onPress={() => oauth('google')}
            style={styles.googleButton}
          />

          <Text variant="caption" color={colors.inkFaint} center style={styles.terms}>
            {t('signIn.agreePrefix')}{' '}
            <Text
              variant="caption"
              color={colors.accent}
              onPress={() => router.push('/terms')}
              accessibilityRole="link"
            >
              {t('signIn.agreeLink')}
            </Text>
            .
          </Text>

          <Pressable onPress={() => router.replace('/welcome')} style={styles.backLink}>
            <Text variant="smallStrong" color={colors.accent} center>
              {t('signIn.backToWelcome')}
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
    width: 64,
    height: 64,
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
    backgroundColor: colors.tint,
    borderRadius: radii.sm,
    padding: 12,
    overflow: 'hidden',
  },
  forgotLink: { alignSelf: 'flex-end', marginBottom: 14, paddingVertical: 2 },
  continue: { marginTop: 4 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 22 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  googleButton: { marginTop: 12 },
  terms: { marginTop: 22 },
  backLink: { marginTop: 14, paddingVertical: 6 },
});
