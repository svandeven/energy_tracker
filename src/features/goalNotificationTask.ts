import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

import { completeGoalFromNotification, isGoalNotification } from './goalsApi';
import { GOAL_DONE_ACTION } from './notifications';

/**
 * Lets the Done button on a goal reminder work without opening the app. Must be
 * defined before the app renders, so index.ts imports this first. Android only:
 * iOS doesn't run JavaScript for a notification action while the app is
 * closed, so there the Done button opens the app (see syncReminders).
 */
const GOAL_TASK = 'sunsteps-goal-done';

if (Platform.OS === 'android') {
  TaskManager.defineTask<Notifications.NotificationTaskPayload>(GOAL_TASK, async ({ data }) => {
    if (!data || !('actionIdentifier' in data) || data.actionIdentifier !== GOAL_DONE_ACTION) return;
    const content = data.notification.request.content.data;
    if (!isGoalNotification(content)) return;
    await completeGoalFromNotification(content);
    await Notifications.dismissNotificationAsync(data.notification.request.identifier);
  });
  void Notifications.registerTaskAsync(GOAL_TASK).catch(() => {});
}
