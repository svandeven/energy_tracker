import { Platform, Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

import { colors } from '../theme';
import { parseTime } from '../lib/dates';
import { Text } from './Text';

export interface TimePickerProps {
  /** Postgres `time` string, e.g. '08:00:00'. */
  value: string;
  /** Called with a new 'HH:MM:00' whenever the user picks a time. */
  onChange(next: string): void;
  /** Called when the picker should close. */
  onDismiss(): void;
}

const pad = (n: number) => String(n).padStart(2, '0');

function toDate(time: string) {
  const { hour, minute } = parseTime(time);
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

/**
 * Native time picker. iOS renders an inline spinner in a sheet that stays open
 * until "Done" — the spinner emits a change event on every tick, so dismissing
 * on change would close it the instant you started scrolling. Android's dialog
 * manages its own lifecycle and reports a single 'set' or 'dismissed'.
 */
export function TimePicker({ value, onChange, onDismiss }: TimePickerProps) {
  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === 'dismissed') {
      onDismiss();
      return;
    }
    if (selected) {
      onChange(`${pad(selected.getHours())}:${pad(selected.getMinutes())}:00`);
    }
    // Android's dialog closes itself after 'set'; iOS waits for Done.
    if (Platform.OS === 'android') onDismiss();
  };

  const picker = (
    <DateTimePicker
      value={toDate(value)}
      mode="time"
      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
      onChange={handleChange}
    />
  );

  if (Platform.OS !== 'ios') return picker;

  return (
    <View style={styles.sheet}>
      {picker}
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
    paddingBottom: 8,
  },
  done: { paddingVertical: 12 },
});
