import type { ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { colors, fonts } from '../../theme';
import { useNotificationResponses } from '../../features/useNotificationResponses';
import { useReminderSync } from '../../features/useReminderSync';
import { useI18n } from '../../i18n';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const icon =
  (active: IconName, idle: IconName) =>
  ({ color, focused }: { color: ColorValue; focused: boolean }) => (
    <Ionicons name={focused ? active : idle} size={22} color={color as string} />
  );

export default function TabsLayout() {
  // Keeps the OS-level reminders in step with the user's questions, goals and toggle.
  useReminderSync();
  // Done buttons and taps on those reminders.
  useNotificationResponses();
  const { t } = useI18n();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          height: 84,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.home'), tabBarIcon: icon('home', 'home-outline') }} />
      <Tabs.Screen
        name="checkin"
        options={{ title: t('tabs.checkIn'), tabBarIcon: icon('clipboard', 'clipboard-outline') }}
      />
      <Tabs.Screen name="goals" options={{ title: t('tabs.goals'), tabBarIcon: icon('list', 'list-outline') }} />
      <Tabs.Screen
        name="progress"
        options={{ title: t('tabs.progress'), tabBarIcon: icon('trending-up', 'trending-up-outline') }}
      />
      <Tabs.Screen
        name="awards"
        options={{ title: t('tabs.awards'), tabBarIcon: icon('ribbon', 'ribbon-outline') }}
      />
      {/* Reached from Progress and the profile button on Home, not the tab bar. */}
      <Tabs.Screen name="history" options={{ href: null, title: t('tabs.history') }} />
      <Tabs.Screen name="settings" options={{ href: null, title: t('tabs.settings') }} />
    </Tabs>
  );
}
