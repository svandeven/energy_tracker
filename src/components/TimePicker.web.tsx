import { Pressable, StyleSheet, View } from 'react-native';

import { colors, fonts, radii } from '../theme';
import { Text } from './Text';
import type { TimePickerProps } from './TimePicker';

/**
 * Web fallback. @react-native-community/datetimepicker ships no web build, so
 * on web we render the browser's own `<input type="time">` — react-native-web
 * renders to the DOM, so raw elements are fine in a .web file.
 */
export function TimePicker({ value, onChange, onDismiss }: TimePickerProps) {
  // <input type="time"> wants 'HH:MM'; Postgres gives us 'HH:MM:SS'.
  const inputValue = value.slice(0, 5);

  return (
    <View style={styles.sheet}>
      <Text variant="label" color={colors.inkMuted} style={styles.label}>
        Reminder time
      </Text>
      <input
        type="time"
        value={inputValue}
        onChange={(e) => {
          const next = e.target.value; // '' when the user clears the field
          if (next) onChange(`${next}:00`);
        }}
        style={{
          fontFamily: fonts.regular,
          fontSize: 17,
          padding: 12,
          borderRadius: radii.sm,
          border: `1px solid ${colors.border}`,
          color: colors.ink,
          background: colors.white,
        }}
      />
      <Pressable onPress={onDismiss} style={styles.done} accessibilityRole="button">
        <Text variant="bodyStrong" color={colors.teal} center>
          Done
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: 16,
    gap: 10,
  },
  label: { textAlign: 'center' },
  done: { paddingVertical: 10 },
});
