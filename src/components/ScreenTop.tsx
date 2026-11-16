import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { colors } from '../theme';
import { useI18n } from '../i18n';
import { Text } from './Text';

interface ScreenTopProps {
  title: string;
  /** Small line above the title, e.g. today's date. */
  caption?: string;
  subtitle?: string;
  /** Shows "‹ Back" above the title. */
  back?: boolean;
  /** Round button on the right, e.g. profile or reminders. */
  action?: {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    label: string;
    onPress(): void;
  };
}

/** "‹ Back", falling back to Home when the screen was opened directly. */
export function BackLink({ inset }: { inset?: boolean }) {
  const router = useRouter();
  const { t } = useI18n();
  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      accessibilityRole="button"
      hitSlop={10}
      style={[styles.back, inset && styles.inset]}
    >
      <Ionicons name="chevron-back" size={16} color={colors.inkMuted} />
      <Text variant="small" color={colors.inkMuted}>
        {t('common.back')}
      </Text>
    </Pressable>
  );
}

/** The title block of the goals design: caption, big title, optional round action. */
export function ScreenTop({ title, caption, subtitle, back, action }: ScreenTopProps) {
  return (
    <View style={styles.wrap}>
      {back && <BackLink />}
      <View style={styles.row}>
        <View style={styles.text}>
          {caption ? (
            <Text variant="small" color={colors.inkMuted}>
              {caption}
            </Text>
          ) : null}
          <Text variant="title">{title}</Text>
          {subtitle ? (
            <Text variant="small" color={colors.inkMuted} style={styles.subtitle}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {action && (
          <Pressable
            onPress={action.onPress}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            hitSlop={8}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
          >
            <Ionicons name={action.icon} size={20} color={colors.onTint} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 8, marginBottom: 18 },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  inset: { marginHorizontal: 20, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  text: { flex: 1 },
  subtitle: { marginTop: 4 },
  action: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: colors.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
});
