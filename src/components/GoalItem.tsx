import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { cardShadow, colors, radii } from '../theme';
import { useI18n } from '../i18n';
import type { GoalRow } from '../lib/database.types';
import { CheckCircle } from './CheckCircle';
import { Text } from './Text';

interface GoalItemProps {
  goal: GoalRow;
  subtitle?: string;
  onToggle(): void;
  /** Tapping the text opens the goal's options, if given. */
  onPress?: () => void;
  /** Extra controls under the row (the expanded options). */
  children?: React.ReactNode;
}

/** A goal with its tick circle; done goals are struck through. */
export function GoalItem({ goal, subtitle, onToggle, onPress, children }: GoalItemProps) {
  const { t } = useI18n();
  const done = goal.done_at != null;
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Pressable
          onPress={onToggle}
          hitSlop={10}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          accessibilityLabel={
            done
              ? t('goals.markNotDoneA11y', { title: goal.title })
              : t('goals.markDoneA11y', { title: goal.title })
          }
        >
          <CheckCircle checked={done} />
        </Pressable>
        <Pressable
          onPress={onPress}
          disabled={!onPress}
          accessibilityRole="button"
          accessibilityLabel={onPress ? t('goals.optionsA11y', { title: goal.title }) : undefined}
          style={styles.text}
        >
          <Text
            variant="bodyStrong"
            color={done ? colors.inkMuted : colors.ink}
            style={done && styles.struck}
          >
            {goal.title}
          </Text>
          {subtitle ? (
            <Text variant="caption" color={colors.inkMuted}>
              {subtitle}
            </Text>
          ) : null}
        </Pressable>
        {goal.remind_at && !done && (
          <Ionicons name="notifications-outline" size={16} color={colors.primary} />
        )}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radii.md, ...cardShadow },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  text: { flex: 1 },
  struck: { textDecorationLine: 'line-through' },
});
