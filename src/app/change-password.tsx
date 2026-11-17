import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AppHeader } from '../components/AppHeader';
import { Button } from '../components/Button';
import { Text } from '../components/Text';
import { colors, fonts, radii } from '../theme';
import { useAuth } from '../providers/AuthProvider';
import { useI18n } from '../i18n';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { changePassword, authProvider } = useAuth();
  const { t, errorText } = useI18n();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Social accounts have no password; offering the form would just fail.
  if (authProvider !== 'email') {
    const label = authProvider.charAt(0).toUpperCase() + authProvider.slice(1);
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader onBackground="surface" />
        <View style={styles.centered}>
          <Ionicons name="information-circle-outline" size={34} color={colors.inkMuted} />
          <Text variant="bodyStrong" center style={styles.centeredTitle}>
            {t('changePassword.noPasswordTitle')}
          </Text>
          <Text variant="small" color={colors.inkMuted} center>
            {t('changePassword.noPasswordBody', { provider: label })}
          </Text>
          <Button
            label={t('common.backToSettings')}
            variant="secondary"
            onPress={() => router.back()}
            style={styles.centeredButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  const submit = async () => {
    if (!current) {
      setError(t('error.currentPasswordRequired'));
      return;
    }
    if (next.length < 6) {
      setError(t('error.newPasswordTooShort'));
      return;
    }
    if (next !== confirm) {
      setError(t('error.passwordsDontMatch'));
      return;
    }
    if (next === current) {
      setError(t('error.samePassword'));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await changePassword(current, next);
      setDone(true);
    } catch (e) {
      setError(errorText(e, 'changePassword.failed'));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader onBackground="surface" />
        <View style={styles.centered}>
          <View style={styles.successBadge}>
            <Ionicons name="checkmark" size={28} color={colors.white} />
          </View>
          <Text variant="heading" center style={styles.centeredTitle}>
            {t('changePassword.doneTitle')}
          </Text>
          <Text variant="small" color={colors.inkMuted} center>
            {t('changePassword.doneBody')}
          </Text>
          <Button
            label={t('common.backToSettings')}
            onPress={() => router.back()}
            style={styles.centeredButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader onBackground="surface" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text variant="title">{t('changePassword.title')}</Text>
          <Text variant="small" color={colors.inkMuted} style={styles.lead}>
            {t('changePassword.lead')}
          </Text>

          <Field label={t('changePassword.current')}>
            <TextInput
              value={current}
              onChangeText={setCurrent}
              placeholder={t('common.currentPasswordPlaceholder')}
              placeholderTextColor={colors.inkFaint}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="current-password"
              style={styles.input}
            />
          </Field>

          <Field label={t('common.newPassword')}>
            <TextInput
              value={next}
              onChangeText={setNext}
              placeholder={t('common.atLeast6')}
              placeholderTextColor={colors.inkFaint}
              secureTextEntry={!show}
              autoCapitalize="none"
              autoComplete="new-password"
              style={styles.input}
            />
            <Pressable
              hitSlop={10}
              onPress={() => setShow((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={show ? t('common.hidePassword') : t('common.showPassword')}
            >
              <Ionicons
                name={show ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={colors.inkFaint}
              />
            </Pressable>
          </Field>

          <Field label={t('common.confirmNewPassword')}>
            <TextInput
              value={confirm}
              onChangeText={setConfirm}
              placeholder={t('changePassword.reenterNew')}
              placeholderTextColor={colors.inkFaint}
              secureTextEntry={!show}
              autoCapitalize="none"
              autoComplete="new-password"
              style={styles.input}
            />
          </Field>

          {error && (
            <Text variant="small" color="#C4342B" style={styles.message}>
              {error}
            </Text>
          )}

          <Button label={t('common.saveNewPassword')} onPress={submit} loading={busy} />

          <Pressable onPress={() => router.back()} style={styles.backLink}>
            <Text variant="smallStrong" color={colors.inkMuted} center>
              {t('common.cancel')}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text variant="label">{label}</Text>
      <View style={styles.inputRow}>
        <Ionicons name="lock-closed-outline" size={18} color={colors.inkFaint} />
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  lead: { marginTop: 4, marginBottom: 24 },
  field: { marginBottom: 16, gap: 8 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
  },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  message: { marginBottom: 12 },
  backLink: { marginTop: 18, paddingVertical: 6 },
  centered: { flex: 1, justifyContent: 'center', paddingHorizontal: 32, gap: 8 },
  centeredTitle: { marginTop: 8 },
  centeredButton: { marginTop: 20 },
  successBadge: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
