import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';

import { addDays, toLocalDate } from '../lib/dates';
import { useGoals } from '../providers/GoalsProvider';
import { useData } from '../providers/DataProvider';
import { isQuestionNotification, saveScoreFromNotification } from './checkinsApi';
import { completeGoalFromNotification, isGoalNotification } from './goalsApi';
import { GOAL_DONE_ACTION, scoreFromAction } from './notifications';

/**
 * Acts on notification taps while the app is running (or was opened by one):
 * the Done button ticks the goal off, a score button saves that score, and a
 * plain tap opens the matching screen. On Android those buttons are handled by
 * notificationActionTask while the app is closed; both paths are safe to run
 * twice.
 *
 * Taps are collected straight away but only acted on once `ready` — the root
 * navigator is mounted and the user is signed in. Navigating any earlier
 * throws inside expo-router, which used to drop the tap and leave the app on
 * whatever screen it opened on.
 */
export function useNotificationResponses(ready: boolean) {
  const router = useRouter();
  const { reload } = useGoals();
  const { reload: reloadData } = useData();
  const seen = useRef(new Set<string>());
  const pending = useRef<Notifications.NotificationResponse[]>([]);
  // Bumped on every new tap so the effect below runs again.
  const [received, setReceived] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const queue = (response: Notifications.NotificationResponse) => {
      const { notification, actionIdentifier } = response;
      const key = `${notification.request.identifier}:${actionIdentifier}:${notification.date}`;
      if (seen.current.has(key)) return;
      seen.current.add(key);
      pending.current.push(response);
      setReceived((n) => n + 1);
    };

    // The tap that launched the app arrives before any listener exists.
    const last = Notifications.getLastNotificationResponse();
    if (last) queue(last);
    const sub = Notifications.addNotificationResponseReceivedListener(queue);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!ready || pending.current.length === 0) return;
    const responses = pending.current;
    pending.current = [];
    Notifications.clearLastNotificationResponse();

    const handle = async ({ notification, actionIdentifier }: Notifications.NotificationResponse) => {
      const data = notification.request.content.data as Record<string, unknown> | undefined;
      if (isGoalNotification(data)) {
        if (actionIdentifier === GOAL_DONE_ACTION) {
          try {
            await completeGoalFromNotification(data);
            await Notifications.dismissNotificationAsync(notification.request.identifier);
          } finally {
            await reload();
          }
          return;
        }
        router.navigate('/goals');
        return;
      }
      if (data?.kind === 'goalPlan' || data?.kind === 'goalReview') {
        router.navigate('/goals');
        return;
      }
      const score = scoreFromAction(actionIdentifier);
      if (score != null && isQuestionNotification(data)) {
        try {
          await saveScoreFromNotification(data, score);
          await Notifications.dismissNotificationAsync(notification.request.identifier);
        } finally {
          await reloadData();
        }
        return;
      }
      if (typeof data?.questionId === 'string') {
        // Reminders name the day they ask about; ones scheduled before that
        // only say whether it's the day before.
        const delivered = toLocalDate(new Date(notification.date));
        const date =
          typeof data.date === 'string' ? data.date : data.nextDay ? addDays(delivered, -1) : delivered;
        router.push({ pathname: '/check-in/[id]', params: { id: data.questionId, date } });
      }
    };

    for (const response of responses) void handle(response);
  }, [ready, received, router, reload, reloadData]);
}
