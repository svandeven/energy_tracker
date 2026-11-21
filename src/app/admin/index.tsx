import { memo, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Card } from '../../components/Card';
import { Text } from '../../components/Text';
import { colors, fonts, radii } from '../../theme';
import { supabase } from '../../lib/supabase';
import {
  BUNDLED,
  LOCALES,
  LOCALE_NAMES,
  TRANSLATION_KEYS,
  type Locale,
  type Overrides,
  type TranslationKey,
  useI18n,
} from '../../i18n';

const DANGER = '#C4342B';
const MAX_WIDTH = 1100;

/** Friendly names for the key prefixes in src/i18n/en.ts. */
const GROUPS: Record<string, string> = {
  common: 'Shared',
  error: 'Errors',
  welcome: 'Welcome',
  signIn: 'Sign in',
  forgot: 'Forgot password',
  reset: 'Reset password',
  authCallback: 'Signing in',
  tabs: 'Tabs',
  home: 'Home',
  dashboard: 'Energy check-in',
  checkIn: 'Check-in',
  summary: 'Summary',
  history: 'History',
  goals: 'Goals',
  addGoal: 'Add goal',
  reminders: 'Goal reminders',
  progress: 'Progress',
  awards: 'Awards',
  settings: 'Settings',
  profile: 'Profile',
  questions: 'Daily questions',
  question: 'Default questions',
  newQuestion: 'New question',
  reminder: 'Reminders',
  changePassword: 'Change password',
  deleteAccount: 'Delete account',
  terms: 'Terms & Privacy',
};

const groupOf = (key: string) => key.split('.')[0];
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);

/**
 * Every built-in string, English and Dutch side by side. Saving stores an
 * override in the `translations` table, which every app picks up on its next
 * launch (and this browser immediately). Saving text identical to the
 * built-in version removes the override instead of storing a copy.
 */
export default function TranslationsScreen() {
  const { overrides, applyOverride } = useI18n();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<string | null>(null);
  const [editedOnly, setEditedOnly] = useState(false);

  const editedCount = useMemo(
    () => LOCALES.reduce((n, l) => n + Object.keys(overrides[l] ?? {}).length, 0),
    [overrides],
  );

  const keys = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TRANSLATION_KEYS.filter((key) => {
      if (group && groupOf(key) !== group) return false;
      if (editedOnly && !LOCALES.some((l) => overrides[l]?.[key] != null)) return false;
      if (!q) return true;
      return (
        key.toLowerCase().includes(q) ||
        LOCALES.some((l) => (overrides[l]?.[key] ?? BUNDLED[l][key]).toLowerCase().includes(q))
      );
    });
  }, [query, group, editedOnly, overrides]);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.inner}>
        <Text variant="title">Text & translations</Text>
        <Text variant="small" color={colors.inkMuted} style={styles.lead}>
          Changes go live as soon as you save: people see them the next time they open Sun Steps. Keep
          anything in {'{curly braces}'} exactly as it is — the app fills those in.
        </Text>

        <View style={styles.toolbar}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search text or key…"
            placeholderTextColor={colors.inkFaint}
            style={[styles.input, styles.search]}
          />
          <Chip
            label={`Edited only (${editedCount})`}
            active={editedOnly}
            onPress={() => setEditedOnly((v) => !v)}
          />
        </View>

        <View style={styles.groups}>
          <Chip label="All screens" active={group == null} onPress={() => setGroup(null)} />
          {Object.entries(GROUPS).map(([id, label]) => (
            <Chip key={id} label={label} active={group === id} onPress={() => setGroup(id)} />
          ))}
        </View>

        <Text variant="caption" color={colors.inkMuted} style={styles.count}>
          {keys.length} of {TRANSLATION_KEYS.length} texts
        </Text>

        {keys.map((key) => (
          <TranslationRow
            key={key}
            textKey={key}
            overrides={pickOverrides(overrides, key)}
            onSaved={applyOverride}
          />
        ))}
      </View>
    </ScrollView>
  );
}

/** Only this key's overrides, so memo() skips rows that didn't change. */
function pickOverrides(overrides: Overrides, key: string) {
  return LOCALES.map((l) => overrides[l]?.[key] ?? null).join('\u0000');
}

const TranslationRow = memo(function TranslationRow({
  textKey,
  overrides: packed,
  onSaved,
}: {
  textKey: TranslationKey;
  /** This key's override per locale, NUL-joined in LOCALES order ('' = none). */
  overrides: string;
  onSaved: (key: string, locale: Locale, value: string | null) => void;
}) {
  const current = packed.split('\u0000');
  const overrideFor = (l: Locale) => current[LOCALES.indexOf(l)] || null;
  const required = placeholders(BUNDLED.en[textKey]);

  return (
    <Card style={styles.row}>
      <Text variant="caption" color={colors.inkFaint} selectable>
        {GROUPS[groupOf(textKey)] ?? groupOf(textKey)} · {textKey}
      </Text>
      <View style={styles.columns}>
        {LOCALES.map((l) => (
          <LocaleField
            key={l}
            textKey={textKey}
            locale={l}
            override={overrideFor(l)}
            required={required}
            onSaved={onSaved}
          />
        ))}
      </View>
    </Card>
  );
});

function LocaleField({
  textKey,
  locale,
  override,
  required,
  onSaved,
}: {
  textKey: TranslationKey;
  locale: Locale;
  override: string | null;
  required: string[];
  onSaved: (key: string, locale: Locale, value: string | null) => void;
}) {
  const builtIn = BUNDLED[locale][textKey];
  const effective = override ?? builtIn;
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const value = draft ?? effective;
  const dirty = draft != null && draft !== effective;
  const missing = required.filter((name) => !value.includes(`{${name}}`));
  const empty = !value.trim();

  const save = async (next: string | null) => {
    setBusy(true);
    setError(null);
    // Matching the built-in text is the same as no override at all.
    const storeNull = next == null || next === builtIn;
    const { error: saveError } = storeNull
      ? await supabase.from('translations').delete().eq('key', textKey).eq('locale', locale)
      : await supabase.from('translations').upsert({ key: textKey, locale, value: next });
    setBusy(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    onSaved(textKey, locale, storeNull ? null : next);
    setDraft(null);
  };

  return (
    <View style={styles.column}>
      <View style={styles.columnHeader}>
        <Text variant="label" color={colors.inkMuted}>
          {LOCALE_NAMES[locale]}
        </Text>
        {override != null && (
          <View style={styles.badge}>
            <Text variant="caption" color={colors.onTint}>
              Edited
            </Text>
          </View>
        )}
      </View>
      <TextInput
        value={value}
        onChangeText={setDraft}
        multiline
        maxLength={2000}
        editable={!busy}
        style={[styles.input, styles.field, dirty && styles.fieldDirty]}
      />
      {missing.length > 0 && (
        <Text variant="caption" color={DANGER}>
          Keep {missing.map((m) => `{${m}}`).join(', ')} in the text.
        </Text>
      )}
      {error && (
        <Text variant="caption" color={DANGER}>
          {error}
        </Text>
      )}
      <View style={styles.actions}>
        {dirty && (
          <>
            <SmallButton
              label={busy ? 'Saving…' : 'Save'}
              primary
              disabled={busy || missing.length > 0 || empty}
              onPress={() => void save(draft)}
            />
            <SmallButton label="Cancel" disabled={busy} onPress={() => setDraft(null)} />
          </>
        )}
        {!dirty && override != null && (
          <SmallButton
            label="Reset to built-in"
            disabled={busy}
            onPress={() => void save(null)}
          />
        )}
      </View>
      {override != null && !dirty && (
        <Text variant="caption" color={colors.inkFaint}>
          Built-in: {builtIn}
        </Text>
      )}
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text variant="caption" color={active ? colors.onTint : colors.inkMuted}>
        {label}
      </Text>
    </Pressable>
  );
}

function SmallButton({
  label,
  onPress,
  primary,
  disabled,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={[styles.smallButton, primary && styles.smallButtonPrimary, disabled && styles.disabled]}
    >
      <Text variant="smallStrong">{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 24, paddingHorizontal: 24 },
  inner: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
  lead: { marginTop: 6, marginBottom: 18, maxWidth: 720 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  search: { flex: 1, minWidth: 220 },
  groups: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  count: { marginTop: 14, marginBottom: 8 },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.ink,
  },
  row: { marginBottom: 12, gap: 10 },
  columns: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  column: { flex: 1, minWidth: 260, gap: 6 },
  columnHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { backgroundColor: colors.tint, borderRadius: radii.pill, paddingHorizontal: 8 },
  field: { minHeight: 44, backgroundColor: colors.surface, borderColor: colors.surface },
  fieldDirty: { borderColor: colors.primary, backgroundColor: colors.white },
  actions: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.tint, borderColor: colors.tint },
  smallButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  smallButtonPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  disabled: { opacity: 0.45 },
});
