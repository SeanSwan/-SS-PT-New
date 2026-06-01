import { format } from 'date-fns';

export interface RecentSessionExercise {
  id: string;
  name: string;
  type: string;
  sets: number;
  status: string;
  experiencePoints: number;
}

export interface RecentWorkoutSession {
  id: string;
  date: string;
  title: string;
  status: string;
  experiencePoints: number;
  completionPercentage: number;
  notes?: string;
  clientName?: string;
  trainerName?: string;
  exercises: RecentSessionExercise[];
}

const isStaffRole = (role: string): boolean => role === 'admin' || role === 'trainer';

const personName = (person: any): string | undefined => {
  if (!person) return undefined;
  return [person.firstName, person.lastName].filter(Boolean).join(' ').trim() || undefined;
};

const normalizeExercises = (raw: any): RecentSessionExercise[] => {
  const normalized = Array.isArray(raw?.exercises)
    ? raw.exercises.map((item: any, index: number) => ({
        id: String(item.id ?? item.exerciseId ?? index),
        name: item.exercise?.name ?? item.exerciseName ?? item.name ?? 'Exercise',
        type: item.exercise?.exerciseType ?? item.exerciseType ?? item.type ?? 'N/A',
        sets: item.setsCompleted ?? item.sets?.length ?? item.totalSets ?? 0,
        status: item.completionStatus ?? item.status ?? 'planned',
        experiencePoints: item.experiencePointsEarned ?? item.experiencePoints ?? 0,
      }))
    : [];

  if (normalized.length > 0 || !Array.isArray(raw?.logs)) return normalized;

  return raw.logs.map((log: any, index: number) => ({
    id: String(log.id ?? index),
    name: log.exerciseName ?? 'Logged exercise',
    type: 'logged',
    sets: log.setNumber ?? 1,
    status: raw.status ?? 'completed',
    experiencePoints: 0,
  }));
};

export const normalizeRecentSession = (raw: any): RecentWorkoutSession => ({
  id: String(raw.id),
  date: raw.date ?? raw.sessionDate ?? raw.completedAt ?? raw.createdAt ?? new Date().toISOString(),
  title: raw.title ?? 'Untitled Session',
  status: raw.status ?? 'planned',
  experiencePoints: raw.experiencePointsEarned ?? raw.experiencePoints ?? 0,
  completionPercentage: raw.completionPercentage ?? (raw.status === 'completed' ? 100 : 0),
  notes: raw.trainerNotes ?? raw.notes ?? '',
  clientName: personName(raw.client ?? raw.user),
  trainerName: personName(raw.trainer),
  exercises: normalizeExercises(raw),
});

export const extractWorkoutSessions = (payload: any): RecentWorkoutSession[] => {
  const root = payload?.data ?? payload;
  const rawSessions = root?.sessions ?? root?.workoutSessions ?? [];

  return Array.isArray(rawSessions) ? rawSessions.map(normalizeRecentSession) : [];
};

export const extractWorkoutSession = (payload: any): RecentWorkoutSession | null => {
  const root = payload?.data ?? payload;
  const rawSession = root?.session ?? root?.workoutSession ?? null;

  return rawSession ? normalizeRecentSession(rawSession) : null;
};

export const getRecentSessionsUrl = (clientId: string, userRole: string): string =>
  isStaffRole(userRole) ? `/api/workout/sessions/user/${clientId}` : '/api/workout/sessions';

export const formatSessionDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date pending';

  return format(date, 'MMM dd, yyyy');
};

export const canCompleteSession = (userRole: string, status: string): boolean =>
  isStaffRole(userRole) && status !== 'completed';
