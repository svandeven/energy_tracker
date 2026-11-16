import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../theme';

/** Round tick used for goals and answered questions. */
export function CheckCircle({ checked, size = 24 }: { checked: boolean; size?: number }) {
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size },
        checked ? styles.checked : styles.empty,
      ]}
    >
      {checked && <Ionicons name="checkmark" size={size * 0.65} color={colors.white} />}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  checked: { backgroundColor: colors.done },
  empty: { borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.white },
});
