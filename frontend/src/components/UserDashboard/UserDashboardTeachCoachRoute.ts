const USER_TEACH_COACH_PATH = '/dashboard/client/coach-assistant';

export const USER_WORKOUTS_TEACH_PROMPT =
  "Teach me the workouts tab. Help me read my workout history, choose what to log next, and find where to save today's session safely.";

export const USER_HOME_TRAINING_PROMPT =
  "Teach me the Home training loop. Help me log today's session, read my progress proof, and decide the next training action safely.";

export interface UserWorkoutsCoachSnapshot {
  hasHistory: boolean;
  totalExerciseTouches?: number;
  mostActiveCategory?: string;
  streak?: number;
  topExercise?: string;
}

const compactPromptValue = (value?: string): string => (
  value?.replace(/[^\w\s'&./-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 48) || ''
);

export const buildUserWorkoutsCoachPrompt = (snapshot?: UserWorkoutsCoachSnapshot): string => {
  if (!snapshot?.hasHistory) {
    return `${USER_WORKOUTS_TEACH_PROMPT} Current workout snapshot: no logged workouts yet. Keep it simple and recommend the first workout to log.`;
  }

  const touches = Math.max(0, Math.round(snapshot.totalExerciseTouches || 0));
  const mostActiveCategory = compactPromptValue(snapshot.mostActiveCategory) || 'not enough history yet';
  const streak = Math.max(0, Math.round(snapshot.streak || 0));
  const topExercise = compactPromptValue(snapshot.topExercise);
  const snapshotParts = [
    `${touches} logged exercise touches`,
    `Most active: ${mostActiveCategory}`,
    `Current streak: ${streak} ${streak === 1 ? 'day' : 'days'}`,
  ];

  if (topExercise) {
    snapshotParts.push(`Top movement: ${topExercise}`);
  }

  return `${USER_WORKOUTS_TEACH_PROMPT} Current workout snapshot: ${snapshotParts.join('; ')}. Use this snapshot to recommend the next workout to log, what to balance, and where to save today's session.`;
};

export const buildUserDashboardTeachCoachRoute = (prompt: string): string => {
  const trimmedPrompt = prompt.trim();
  if (!trimmedPrompt) return USER_TEACH_COACH_PATH;

  const params = new URLSearchParams({ teachPrompt: trimmedPrompt });
  return `${USER_TEACH_COACH_PATH}?${params.toString()}`;
};
