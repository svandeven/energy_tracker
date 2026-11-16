import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radii } from '../theme';
import { LOCALES, LOCALE_NAMES, type Locale, useI18n } from '../i18n';
import { Text } from './Text';

/**
 * Compact "EN | NL" pill for screens shown before sign-in, where the Settings
 * language picker isn't reachable. Picking one stores it as the preference.
 */
export function LanguageSwitch() {
  const { locale, setPreference } = useI18n();
  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {LOCALES.map((l: Locale) => {
        const active = l === locale;
        return (
          <Pressable
            key={l}
            onPress={() => setPreference(l)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={LOCALE_NAMES[l]}
            hitSlop={6}
            style={[styles.option, active && styles.optionActive]}
          >
            <Text variant="label" color={active ? colors.ink : colors.inkMuted}>
              {l.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    padding: 3,
  },
  option: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill },
  optionActive: { backgroundColor: colors.white },
});
