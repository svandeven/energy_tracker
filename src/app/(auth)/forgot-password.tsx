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
  const { requestPasswordReset, verifyRecovery } = useAuth();

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
    const input = code.trim();
    if (!input) {
      setError('Paste the link from the email, or enter the 6-digit code.');
      return;
    }
    if (!input.includes('://') && input.length < 6) {
      setError('That code looks too short — it should be 6 digits.');
      return;
    }
    setError(null);
    setBusy('verify');
    try {
      await verifyRecovery(email, input);
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
              ? 'We sent you an email. Paste the link from it below — or the 6-digit code, if your email contains one.'
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
              <Text variant="label">Link or code from the email</Text>
              <View style={[styles.inputRow, styles.inputRowTall]}>
                <Ionicons name="link-outline" size={18} color={colors.inkFaint} />
                <TextInput
                  value={code}
                  onChangeText={setCode}
                  placeholder="Paste the link, or type the 6-digit code"
                  placeholderTextColor={colors.inkFaint}
                  autoCapitalize="none"
                  autoCorrect={false}
                  multiline
                  style={[styles.input, styles.linkInput]}
                />
              </View>
              <Text variant="caption" color={colors.inkMuted}>
                In the email, long-press the button and choose Copy Link.
              </Text>
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
  inputRowTall: { height: undefined, minHeight: 52, paddingVertical: 10, alignItems: 'flex-start' },
  linkInput: { fontSize: 14, minHeight: 32 },
  message: { marginBottom: 12 },
  resend: { marginTop: 14, paddingVertical: 6 },
  backLink: { marginTop: 22, paddingVertical: 6 },
});
