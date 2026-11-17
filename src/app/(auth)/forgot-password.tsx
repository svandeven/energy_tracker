import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '../../components/Button';
import { Text } from '../../components/Text';
import { colors, fonts, radii } from '../../theme';
import { useAuth } from '../../providers/AuthProvider';
import { useI18n } from '../../i18n';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { requestPasswordReset, verifyRecovery } = useAuth();
  const { t, errorText } = useI18n();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState<'send' | 'verify' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError(t('forgot.emailRequired'));
      return;
    }
    setError(null);
    setBusy('send');
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (e) {
      setError(errorText(e, 'forgot.sendFailed'));
    } finally {
      setBusy(null);
    }
  };

  const verify = async () => {
    const input = code.trim();
    if (!input) {
      setError(t('forgot.codeRequired'));
      return;
    }
    if (!input.includes('://') && input.length < 6) {
      setError(t('forgot.codeTooShort'));
      return;
    }
    setError(null);
    setBusy('verify');
    try {
      await verifyRecovery(email, input);
      // The auth gate sends us to /reset-password once recovery is active.
    } catch (e) {
      setError(errorText(e, 'forgot.codeRejected'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.badge}>
            <Ionicons name="key-outline" size={26} color={colors.ink} />
          </View>
          <Text variant="title" center>
            {t('forgot.title')}
          </Text>
          <Text variant="small" color={colors.inkMuted} center style={styles.lead}>
            {sent ? t('forgot.leadAfter') : t('forgot.leadBefore')}
          </Text>

          <View style={styles.field}>
            <Text variant="label">{t('common.email')}</Text>
            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={18} color={colors.inkFaint} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder={t('common.emailPlaceholder')}
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
              <Text variant="label">{t('forgot.codeLabel')}</Text>
              <View style={[styles.inputRow, styles.inputRowTall]}>
                <Ionicons name="link-outline" size={18} color={colors.inkFaint} />
                <TextInput
                  value={code}
                  onChangeText={setCode}
                  placeholder={t('forgot.codePlaceholder')}
                  placeholderTextColor={colors.inkFaint}
                  autoCapitalize="none"
                  autoCorrect={false}
                  multiline
                  style={[styles.input, styles.linkInput]}
                />
              </View>
              <Text variant="caption" color={colors.inkMuted}>
                {t('forgot.copyHint')}
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
              <Button label={t('common.continue')} onPress={verify} loading={busy === 'verify'} />
              <Pressable onPress={send} disabled={busy !== null} style={styles.resend}>
                <Text variant="smallStrong" color={colors.accent} center>
                  {busy === 'send' ? t('forgot.sending') : t('forgot.sendAnother')}
                </Text>
              </Pressable>
            </>
          ) : (
            <Button label={t('forgot.send')} onPress={send} loading={busy === 'send'} />
          )}

          <Pressable onPress={() => router.replace('/sign-in?mode=login')} style={styles.backLink}>
            <Text variant="smallStrong" color={colors.inkMuted} center>
              {t('forgot.backToLogin')}
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
