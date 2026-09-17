import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '../../components/Button';
import { Text } from '../../components/Text';
import { colors, fonts, radii } from '../../theme';
import { useAuth } from '../../providers/AuthProvider';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { updatePassword, signOut } = useAuth();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (password.length < 6) {
      setError('Passwords need at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Those passwords don’t match.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await updatePassword(password);
      // Clearing recovery lets the auth gate drop us into the app.
      router.replace('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update your password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.badge}>
            <Ionicons name="lock-open-outline" size={26} color={colors.ink} />
          </View>
          <Text variant="title" center>
            Choose a new password
          </Text>
          <Text variant="small" color={colors.inkMuted} center style={styles.lead}>
            You&apos;re signed in from the reset link. Set a new password to finish.
          </Text>

          <View style={styles.field}>
            <Text variant="label">New password</Text>
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.inkFaint} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="At least 6 characters"
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
                accessibilityLabel={show ? 'Hide password' : 'Show password'}
              >
                <Ionicons
                  name={show ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={colors.inkFaint}
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.field}>
            <Text variant="label">Confirm new password</Text>
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.inkFaint} />
              <TextInput
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Re-enter your password"
                placeholderTextColor={colors.inkFaint}
                secureTextEntry={!show}
                autoCapitalize="none"
                autoComplete="new-password"
                style={styles.input}
              />
            </View>
          </View>

          {error && (
            <Text variant="small" color="#C4342B" style={styles.message}>
              {error}
            </Text>
          )}

          <Button label="Save new password" onPress={submit} loading={busy} />

          <Pressable
            onPress={async () => {
              await signOut();
              router.replace('/welcome');
            }}
            style={styles.backLink}
          >
            <Text variant="smallStrong" color={colors.inkMuted} center>
              Cancel and sign out
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
    backgroundColor: colors.mint,
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
  message: { marginBottom: 12 },
  backLink: { marginTop: 22, paddingVertical: 6 },
});
