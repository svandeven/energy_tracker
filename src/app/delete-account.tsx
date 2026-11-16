import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AppHeader } from '../components/AppHeader';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Text } from '../components/Text';
import { colors, fonts, radii } from '../theme';
import { useAuth } from '../providers/AuthProvider';
import { useI18n } from '../i18n';

const DANGER = '#C4342B';

/**
 * Permanent account deletion, required in-app by App Store guideline 5.1.1(v).
 * A full screen rather than an Alert because Alert.alert does nothing on web,
 * and typing the confirmation word makes an accidental tap impossible.
 */
export default function DeleteAccountScreen() {
  const router = useRouter();
  const { deleteAccount, authProvider, session } = useAuth();
  const { t, errorText } = useI18n();
  const needsPassword = authProvider === 'email';
  // The word is translated ("VERWIJDER" in Dutch); the English one always works too.
  const confirmWord = t('deleteAccount.confirmWord');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const typed = confirm.trim().toUpperCase();
  const confirmed = typed === confirmWord.toUpperCase() || typed === 'DELETE';

  const submit = async () => {
    if (needsPassword && !password) {
      setError(t('error.passwordRequired'));
      return;
    }
    if (!confirmed) {
      setError(t('deleteAccount.typeToConfirmError', { word: confirmWord }));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      // On success the session is cleared and the auth gate takes over, so
      // there is no "done" state to render here.
      await deleteAccount(needsPassword ? password : undefined);
    } catch (e) {
      setError(errorText(e, 'deleteAccount.failed'));
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader onBackground="surface" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text variant="title">{t('deleteAccount.title')}</Text>
          <Text variant="small" color={colors.inkMuted} style={styles.lead}>
            {session?.user?.email
              ? t('deleteAccount.leadEmail', { email: session.user.email })
              : t('deleteAccount.lead')}
          </Text>

          <Card style={styles.warning}>
            <View style={styles.warningHeader}>
              <Ionicons name="warning-outline" size={20} color={DANGER} />
              <Text variant="bodyStrong">{t('deleteAccount.cantUndo')}</Text>
            </View>
            <Bullet>{t('deleteAccount.bullet1')}</Bullet>
            <Bullet>{t('deleteAccount.bullet2')}</Bullet>
            <Bullet>{t('deleteAccount.bullet3')}</Bullet>
            <Text variant="small" color={colors.inkMuted} style={styles.warningFoot}>
              {t('deleteAccount.foot')}
            </Text>
          </Card>

          {needsPassword && (
            <Field label={t('common.password')} icon="lock-closed-outline">
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder={t('common.currentPasswordPlaceholder')}
                placeholderTextColor={colors.inkFaint}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="current-password"
                style={styles.input}
              />
            </Field>
          )}

          <Field label={t('deleteAccount.typeToConfirm', { word: confirmWord })} icon="trash-outline">
            <TextInput
              value={confirm}
              onChangeText={setConfirm}
              placeholder={confirmWord}
              placeholderTextColor={colors.inkFaint}
              autoCapitalize="characters"
              autoCorrect={false}
              style={styles.input}
            />
          </Field>

          {error && (
            <Text variant="small" color={DANGER} style={styles.message}>
              {error}
            </Text>
          )}

          <Pressable
            onPress={submit}
            disabled={busy}
            accessibilityRole="button"
            accessibilityState={{ disabled: busy || !confirmed }}
            style={({ pressed }) => [
              styles.deleteButton,
              (!confirmed || busy) && styles.deleteButtonIdle,
              pressed && styles.pressed,
            ]}
          >
            <Text variant="bodyStrong" color={colors.white} center>
              {busy ? t('deleteAccount.deleting') : t('deleteAccount.submit')}
            </Text>
          </Pressable>

          <Button
            label={t('deleteAccount.keep')}
            variant="secondary"
            onPress={() => router.back()}
            disabled={busy}
            style={styles.cancel}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.bullet}>
      <Text variant="small" color={colors.inkMuted}>
        •
      </Text>
      <Text variant="small" style={styles.bulletText}>
        {children}
      </Text>
    </View>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text variant="label">{label}</Text>
      <View style={styles.inputRow}>
        <Ionicons name={icon} size={18} color={colors.inkFaint} />
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  lead: { marginTop: 4, marginBottom: 20 },
  warning: { marginBottom: 22, gap: 6 },
  warningHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  warningFoot: { marginTop: 6 },
  bullet: { flexDirection: 'row', gap: 8 },
  bulletText: { flex: 1 },
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
  deleteButton: {
    height: 54,
    borderRadius: radii.md,
    backgroundColor: DANGER,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  deleteButtonIdle: { opacity: 0.45 },
  cancel: { marginTop: 12 },
  pressed: { opacity: 0.7 },
});
