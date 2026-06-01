import type { WorkoutLog } from './ViewSessionModal.types';

export const formatSessionDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Invalid Date';
  }
};

export const formatSessionTime = (dateString: string | null | undefined) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Invalid Time';
  }
};

export const groupWorkoutLogs = (logs: WorkoutLog[]) => {
  const groups: Record<string, WorkoutLog[]> = {};

  for (const log of logs) {
    const key = log.exerciseName || 'Unknown';
    if (!groups[key]) groups[key] = [];
    groups[key].push(log);
  }

  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => a.setNumber - b.setNumber);
  }

  return groups;
};
