import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

import { isQuestionNotification, saveScoreFromNotification } from './checkinsApi';
import { completeGoalFromNotification, isGoalNotification } from './goalsApi';
import { GOAL_DONE_ACTION, scoreFromAction } from './notifications';

/**
 * Lets the Done button on a goal reminder and the score buttons on a question
 * reminder work without opening the app. Must be defined before the app
 * renders, so index.ts imports this first. Android only: iOS doesn't run
 * JavaScript for a notification action while the app is closed, so there the
 * buttons open the app (see syncReminders).
 */
// Kept from when this only handled Done, so existing installs keep the same task.
const ACTION_TASK = 'sunsteps-goal-done';

if (Platform.OS === 'android') {
  TaskManager.defineTask<Notifications.NotificationTaskPayload>(ACTION_TASK, async ({ data }) => {
    if (!data || !('actionIdentifier' in data)) return;
    const content = data.notification.request.content.data;
    const score = scoreFromAction(data.actionIdentifier);
    if (data.actionIdentifier === GOAL_DONE_ACTION && isGoalNotification(content)) {
      await completeGoalFromNotification(content);
    } else if (score != null && isQuestionNotification(content)) {
      await saveScoreFromNotification(content, score);
    } else {
      return;
    }
    await Notifications.dismissNotificationAsync(data.notification.request.identifier);
  });
  void Notifications.registerTaskAsync(ACTION_TASK).catch(() => {});
}
