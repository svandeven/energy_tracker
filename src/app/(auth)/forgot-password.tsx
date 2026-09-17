import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '../../components/Button';
import { Text } from '../../components/Text';
import { colors, fonts, radii } from '../../theme';
import { useAuth } from '../../providers/AuthProvider';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { requestPasswordReset, verifyRecoveryCode } = useAuth();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState<'send' | 'verify' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Enter the email address for your account.');
      return;
    }
    setError(null);
    setBusy('send');
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the reset email.');
    } finally {
      setBusy(null);
    }
  };

  const verify = async () => {
    if (code.trim().length < 6) {
      setError('Enter the 6-digit code from the email.');
      return;
    }
    setError(null);
    setBusy('verify');
    try {
      await verifyRecoveryCode(email, code);
      // The auth gate sends us to /reset-password once recovery is active.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That code was not accepted.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.badge}>
            <Ionicons name="key-outline" size={26} color={colors.ink} />
          </View>
          <Text variant="title" center>
            Reset your password
          </Text>
          <Text variant="small" color={colors.inkMuted} center style={styles.lead}>
            {sent
              ? 'We sent you an email. Tap the link in it, or enter the 6-digit code below.'
              : "Enter your email and we'll send you a link and a code."}
          </Text>

          <View style={styles.field}>
            <Text variant="label">Email</Text>
            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={18} color={colors.inkFaint} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={colors.inkFaint}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                editable={!sent}
                style={styles.input}
              />
            </View>
          </View>

          {sent && (
            <View style={styles.field}>
              <Text variant="label">6-digit code</Text>
              <View style={styles.inputRow}>
                <Ionicons name="keypad-outline" size={18} color={colors.inkFaint} />
                <TextInput
                  value={code}
                  onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  placeholderTextColor={colors.inkFaint}
                  keyboardType="number-pad"
                  maxLength={6}
                  style={[styles.input, styles.codeInput]}
                />
              </View>
            </View>
          )}

          {error && (
            <Text variant="small" color="#C4342B" style={styles.message}>
              {error}
            </Text>
          )}

          {sent ? (
            <>
              <Button label="Continue" onPress={verify} loading={busy === 'verify'} />
              <Pressable onPress={send} disabled={busy !== null} style={styles.resend}>
                <Text variant="smallStrong" color={colors.teal} center>
                  {busy === 'send' ? 'Sending…' : 'Send another email'}
                </Text>
              </Pressable>
            </>
          ) : (
            <Button label="Send reset email" onPress={send} loading={busy === 'send'} />
          )}

          <Pressable onPress={() => router.replace('/sign-in?mode=login')} style={styles.backLink}>
            <Text variant="smallStrong" color={colors.inkMuted} center>
              Back to log in
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 32 },
  badge: {
    alignSelf: 'center',
    width: 58,
    height: 58,
    borderRadius: radii.md,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  lead: { marginTop: 6, marginBottom: 26 },
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
  },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  codeInput: { fontFamily: fonts.bold, fontSize: 20, letterSpacing: 6 },
  message: { marginBottom: 12 },
  resend: { marginTop: 14, paddingVertical: 6 },
  backLink: { marginTop: 22, paddingVertical: 6 },
});
