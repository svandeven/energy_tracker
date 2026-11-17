import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';

import { addDays, toLocalDate } from '../lib/dates';
import { useGoals } from '../providers/GoalsProvider';
import { completeGoalFromNotification, isGoalNotification } from './goalsApi';
import { GOAL_DONE_ACTION } from './notifications';

/**
 * Acts on notification taps while the app is running (or was opened by one):
 * the Done button ticks the goal off, and a plain tap opens the matching
 * screen. On Android a Done tap while the app is closed is handled by
 * goalNotificationTask instead; both paths are safe to run twice.
 */
export function useNotificationResponses() {
  const router = useRouter();
  const { reload } = useGoals();
  const handled = useRef(new Set<string>());

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const handle = async (response: Notifications.NotificationResponse) => {
      const { notification, actionIdentifier } = response;
      const key = `${notification.request.identifier}:${actionIdentifier}:${notification.date}`;
      if (handled.current.has(key)) return;
      handled.current.add(key);
      Notifications.clearLastNotificationResponse();

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
        router.push('/goals');
        return;
      }
      if (data?.kind === 'goalPlan' || data?.kind === 'goalReview') {
        router.push('/goals');
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

    const last = Notifications.getLastNotificationResponse();
    if (last) void handle(last);
    const sub = Notifications.addNotificationResponseReceivedListener((r) => void handle(r));
    return () => sub.remove();
  }, [router, reload]);
}
