import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { ScreenTop } from '../components/ScreenTop';
import { Text } from '../components/Text';
import { cardShadow, colors, fonts, radii } from '../theme';
import { pickAvatar } from '../features/avatar';
import { useAuth } from '../providers/AuthProvider';
import { useI18n } from '../i18n';

const DANGER = '#C4342B';

/** Profile picture and display name. Opened from the top of Settings. */
export default function ProfileScreen() {
  const { t } = useI18n();
  const { profile, session, setDisplayName, setAvatar } = useAuth();
  // Null until the user types, so the field follows the profile once it loads.
  const [draft, setDraft] = useState<string | null>(null);
  const name = draft ?? profile?.display_name ?? '';
  const [savingName, setSavingName] = useState(false);
  const [savedName, setSavedName] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameChanged = name.trim() !== (profile?.display_name ?? '');

  const choosePhoto = async () => {
    setError(null);
    try {
      const picked = await pickAvatar();
      if (!picked) return;
      setPhotoBusy(true);
      await setAvatar(picked.base64);
    } catch {
      setError(t('profile.photoFailed'));
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = async () => {
    setError(null);
    setPhotoBusy(true);
    try {
      await setAvatar(null);
    } catch {
      setError(t('profile.photoFailed'));
    } finally {
      setPhotoBusy(false);
    }
  };

  const saveName = async () => {
    if (!name.trim()) {
      setError(t('profile.nameRequired'));
      return;
    }
    setError(null);
    setSavingName(true);
    try {
      await setDisplayName(name);
      setSavedName(true);
    } catch {
      setError(t('profile.saveFailed'));
    } finally {
      setSavingName(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ScreenTop back title={t('profile.title')} subtitle={t('profile.subtitle')} />

        <View style={styles.photo}>
          <View>
            <Avatar url={profile?.avatar_url} name={profile?.display_name} size={112} />
            {photoBusy && (
              <View style={styles.photoBusy}>
                <ActivityIndicator color={colors.white} />
              </View>
            )}
          </View>
          <View style={styles.photoActions}>
            <Pressable
              onPress={() => void choosePhoto()}
              disabled={photoBusy}
              accessibilityRole="button"
              style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
            >
              <Text variant="smallStrong" color={colors.onTint}>
                {profile?.avatar_url ? t('profile.changePhoto') : t('profile.addPhoto')}
              </Text>
            </Pressable>
            {profile?.avatar_url && (
              <Pressable
                onPress={() => void removePhoto()}
                disabled={photoBusy}
                accessibilityRole="button"
                style={({ pressed }) => [styles.chip, styles.chipQuiet, pressed && styles.pressed]}
              >
                <Text variant="smallStrong" color={colors.inkMuted}>
                  {t('profile.removePhoto')}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        <Text variant="label" style={styles.label}>
          {t('profile.name')}
        </Text>
        <TextInput
          value={name}
          onChangeText={(value) => {
            setDraft(value);
            setSavedName(false);
            setError(null);
          }}
          placeholder={t('profile.namePlaceholder')}
          placeholderTextColor={colors.inkFaint}
          style={styles.input}
          maxLength={60}
          autoCapitalize="words"
          autoComplete="name"
          returnKeyType="done"
          onSubmitEditing={() => nameChanged && void saveName()}
        />
        <Text variant="caption" color={colors.inkMuted} style={styles.hint}>
          {t('profile.nameHint')}
        </Text>

        {session?.user?.email && (
          <Text variant="caption" color={colors.inkMuted} style={styles.hint}>
            {t('profile.email', { email: session.user.email })}
          </Text>
        )}

        {error && (
          <Text variant="small" color={DANGER} style={styles.error}>
            {error}
          </Text>
        )}

        <Button
          label={savedName && !nameChanged ? t('profile.saved') : t('common.save')}
          variant="dark"
          loading={savingName}
          disabled={!nameChanged}
          onPress={() => void saveName()}
          style={styles.save}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  photo: { alignItems: 'center', gap: 14, marginTop: 4, marginBottom: 8 },
  photoBusy: {
    position: 'absolute',
    inset: 0,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoActions: { flexDirection: 'row', gap: 8 },
  chip: {
    backgroundColor: colors.tint,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipQuiet: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  label: { marginTop: 18, marginBottom: 8 },
  input: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.ink,
    ...cardShadow,
  },
  hint: { marginTop: 8, marginHorizontal: 4 },
  error: { marginTop: 14 },
  save: { marginTop: 22 },
  pressed: { opacity: 0.7 },
});
