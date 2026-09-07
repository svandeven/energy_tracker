import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import type { QuestionRow } from '../lib/database.types';
import { parseTime } from '../lib/dates';

/** Identifies our reminders so we never cancel someone else's notifications. */
const CHANNEL_ID = 'energy-checkins';

/**
 * expo-notifications has no scheduling implementation on web — calling
 * `cancelAllScheduledNotificationsAsync` or `scheduleNotificationAsync` there
 * throws outright. Everything below no-ops instead so the web smoke build and
 * any future browser target keep working.
 */
const SUPPORTED = Platform.OS !== 'web';

if (SUPPORTED) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function requestPermission(): Promise<boolean> {
  if (!SUPPORTED) return false;
  // Simulators can't receive notifications, so don't prompt there either.
  if (!Device.isDevice) return false;
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  if (!existing.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Energy check-ins',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 200],
  });
}

/**
 * Replaces all scheduled reminders with one daily notification per question.
 * Called whenever the questions, their times, or the push toggle change —
 * cheaper and less error-prone than diffing against what's already scheduled.
 */
export async function syncReminders(questions: QuestionRow[], enabled: boolean) {
  if (!SUPPORTED) return;

  const granted = enabled && questions.length > 0 ? await requestPermission() : false;

  // Clear first so turning the toggle off (or losing permission) really stops
  // the reminders, then re-add only if we're allowed to.
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!granted) return;

  await ensureAndroidChannel();

  for (const question of questions) {
    const { hour, minute } = parseTime(question.reminder_time);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: question.title,
        body: 'Time for a quick check-in.',
        data: { questionId: question.id },
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  }
}

export async function cancelReminders() {
  if (!SUPPORTED) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}
