import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { colors, fonts } from '../../theme';
import { useReminderSync } from '../../features/useReminderSync';
import { useI18n } from '../../i18n';

export default function TabsLayout() {
  // Keeps the OS-level daily reminders in step with the user's questions/toggle.
  useReminderSync();
  const { t } = useI18n();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.ink,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          height: 84,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 12 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t('tabs.history'),
          tabBarIcon: ({ color }) => <Ionicons name="analytics-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ color }) => <Ionicons name="settings-sharp" size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}
