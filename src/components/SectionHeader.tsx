import { Pressable, StyleSheet, View } from 'react-native';

import { colors } from '../theme';
import { Text } from './Text';

/** "Daily goals ............ See all" */
export function SectionHeader({
  title,
  aside,
  onAsidePress,
}: {
  title: string;
  aside?: string;
  onAsidePress?: () => void;
}) {
  return (
    <View style={styles.row}>
      <Text variant="bodyStrong">{title}</Text>
      {aside ? (
        onAsidePress ? (
          <Pressable onPress={onAsidePress} accessibilityRole="link" hitSlop={8}>
            <Text variant="smallStrong" color={colors.accent}>
              {aside}
            </Text>
          </Pressable>
        ) : (
          <Text variant="small" color={colors.inkMuted}>
            {aside}
          </Text>
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
});
