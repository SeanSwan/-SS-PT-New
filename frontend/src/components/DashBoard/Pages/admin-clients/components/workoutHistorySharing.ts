import type {
  PersonalRecord,
  WorkoutSession,
} from '../../../../../hooks/analytics/useWorkoutAnalytics';
import { formatWorkoutHistoryVolume } from './workoutHistoryFormatters';

export interface WorkoutHistoryShareModalState {
  postType: 'workout' | 'achievement';
  workoutSessionId?: string;
  prefilledContent: string;
}

export function buildPersonalRecordShareSession(pr: PersonalRecord): WorkoutSession {
  return {
    id: `pr-${pr.exercise}`,
    title: pr.exercise,
    date: pr.date,
    duration: 0,
    intensity: 0,
    status: 'completed',
    totalSets: 0,
    totalReps: pr.reps,
    totalWeight: pr.weight,
    logs: [],
  };
}

export function buildWorkoutHistoryShareModalState(
  clientName: string,
  shareSession: WorkoutSession | null,
): WorkoutHistoryShareModalState {
  if (!shareSession) {
    return {
      postType: 'workout',
      workoutSessionId: undefined,
      prefilledContent: '',
    };
  }

  const isPersonalRecordShare = shareSession.id.startsWith('pr-');

  if (isPersonalRecordShare) {
    return {
      postType: 'achievement',
      workoutSessionId: undefined,
      prefilledContent: `New Personal Record! ${clientName} hit ${shareSession.totalWeight} lbs x ${shareSession.totalReps} reps on ${shareSession.title}!`,
    };
  }

  return {
    postType: 'workout',
    workoutSessionId: shareSession.id,
    prefilledContent: `${clientName} crushed a ${shareSession.title} workout! ${shareSession.logs.length} exercises, ${formatWorkoutHistoryVolume(shareSession.totalWeight)} total volume.`,
  };
}
