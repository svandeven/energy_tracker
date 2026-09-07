/**
 * Mirrors the seed data in supabase/schema.sql. Kept in sync by hand so the
 * client can recover an account whose questions were never seeded.
 */
interface DefaultQuestion {
  title: string;
  icon: string;
  /** Descriptions for scores 0, 1 and 2. */
  score_labels: string[];
  reminder_time: string;
  is_active: boolean;
}

export const DEFAULT_QUESTIONS: DefaultQuestion[] = [
  {
    title: 'Morning readiness',
    icon: 'sun',
    score_labels: [
      'Groggy, hard to get out of bed',
      'Okay, took a while to wake up',
      'Refreshed and ready to go',
    ],
    reminder_time: '08:00',
    is_active: true,
  },
  {
    title: 'Daytime stamina',
    icon: 'battery',
    score_labels: [
      'Drained by midday, needed to rest',
      'Steady but dipped in the afternoon',
      'Energized and focused all day',
    ],
    reminder_time: '13:00',
    is_active: true,
  },
  {
    title: 'Movement capacity',
    icon: 'run',
    score_labels: [
      'No energy for any activity',
      'Managed light movement or a short walk',
      'Full workout felt great',
    ],
    reminder_time: '17:00',
    is_active: true,
  },
  {
    title: 'Evening capacity',
    icon: 'moon',
    score_labels: [
      'Completely wiped out after dinner',
      'Some energy left for light tasks',
      'Still active and productive tonight',
    ],
    reminder_time: '20:00',
    is_active: true,
  },
  {
    title: 'Mental clarity & mood',
    icon: 'brain',
    score_labels: [
      'Foggy, low mood, hard to focus',
      'Fairly clear, mood was neutral',
      'Sharp, positive, and motivated',
    ],
    reminder_time: '21:30',
    is_active: true,
  },
];
