/**
 * FILE: ClientDashboardHome.viewModel.ts
 * PURPOSE: Data shaping for the client dashboard Home redesign.
 */
import type { MacroSummary } from '../../../hooks/useMacroSummary';
import type { HomeTrainingProof } from './HomeTabProofViewModel';
import type { HomeLeaderboardRow } from './HomeTabViewModel';
import type { CurrentClientWorkout } from '../../DashBoard/Pages/client-dashboard/observatory/useCurrentClientWorkout';
import type { Session } from '../../UniversalMasterSchedule/types';

const WEEKLY_GOAL = 5;
const MINUTES_PER_WORKOUT_GOAL = 45;
const CLIENT_WORKOUTS_PATH = '/dashboard/client/workouts';

export interface MetricRow {
  label: string;
  value: string;
  meta?: string;
}

export interface TodaySnapshot {
  dateLabel: string;
  rows: MetricRow[];
  weeklyCompleted: number;
  weeklyGoal: number;
}

export interface AssignmentView {
  kicker: string;
  title: string;
  meta: string;
  rows: Array<{ label: string; meta: string; complete: boolean }>;
  actionPath: string;
  actionLabel: string;
  /** Today's session is already logged — drives the done state on the Program Shelf. */
  complete: boolean;
  empty: boolean;
  loading: boolean;
  error: boolean;
}

export interface SessionPreview {
  title: string;
  date: string;
  time: string;
  coach: string;
  path: string;
  empty: boolean;
  loading: boolean;
  error: boolean;
}

export interface InsightRow {
  label: string;
  value: string;
  status: string;
  points: number[];
}

export function compactClientNumber(value: number | undefined | null): string {
  const safe = Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : 0;
  return Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(safe);
}

export function clampDashboardPercent(value: number | undefined | null): number {
  const safe = Number(value);
  if (!Number.isFinite(safe)) return 0;
  return Math.min(Math.max(Math.round(safe), 0), 100);
}

function safeWhole(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

function sessionTime(session: unknown): number {
  if (!session || typeof session !== 'object') return Number.NaN;
  const record = session as Record<string, unknown>;
  return new Date(String(record.date ?? record.completedAt ?? record.createdAt ?? '')).getTime();
}

export function buildTodaySnapshot({
  sessions,
  proof,
  macroSummary,
  macroLoading,
  now = new Date(),
}: {
  sessions?: unknown[] | null;
  proof: HomeTrainingProof;
  macroSummary?: MacroSummary | null;
  macroLoading?: boolean;
  now?: Date;
}): TodaySnapshot {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayCount = (sessions || []).filter((session) => {
    const time = sessionTime(session);
    return Number.isFinite(time) && time >= todayStart.getTime() && time <= now.getTime();
  }).length;
  const calories = macroLoading ? 'Loading' : macroSummary ? `${safeWhole(macroSummary.totalCalories).toLocaleString()} cal` : 'Not available';
  // Panel launch review 2026-08-03 (gap a): never lead the money surface with a
  // metric we cannot measure. The 4th tile is real logged data — sessions this
  // month — instead of a dead "Average Heart Rate: Not available" placeholder.
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const monthCount = (sessions || []).filter((session) => {
    const time = sessionTime(session);
    return Number.isFinite(time) && time >= monthStart && time <= now.getTime();
  }).length;
  return {
    dateLabel: now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
    rows: [
      { label: 'Workouts Logged', value: String(todayCount), meta: todayCount ? 'Today' : 'No log yet' },
      { label: 'Total Workout Time', value: `${proof.minutesThisWeek || 0} min`, meta: 'This week' },
      { label: 'Calories Logged', value: calories, meta: macroSummary ? 'Nutrition log' : 'No calorie log yet' },
      { label: 'Sessions This Month', value: String(monthCount), meta: monthCount ? 'Logged sessions' : 'First one starts the story' },
    ],
    weeklyCompleted: Math.min(proof.thisWeekCount, WEEKLY_GOAL),
    weeklyGoal: WEEKLY_GOAL,
  };
}

function isCompletedAssignment(workout?: CurrentClientWorkout | null): boolean {
  return workout?.assignmentStatus === 'completed';
}

function assignmentPath(workout?: CurrentClientWorkout | null): string {
  if (isCompletedAssignment(workout)) return CLIENT_WORKOUTS_PATH;
  if (workout?.assignmentType === 'trainer_session' && !workout.isLoggable) return '/dashboard/client/schedule';

  const params = new URLSearchParams({ loadPlan: 'today' });
  if (workout?.assignmentKey) params.set('assignmentKey', workout.assignmentKey);
  if (workout?.assignmentType) params.set('assignmentType', workout.assignmentType);
  return workout?.isLoggable
    ? `/dashboard/client/log-workout?${params.toString()}`
    : CLIENT_WORKOUTS_PATH;
}

export function buildAssignmentView({
  workout,
  loading,
  error,
}: {
  workout?: CurrentClientWorkout | null;
  loading?: boolean;
  error?: boolean;
}): AssignmentView {
  const complete = isCompletedAssignment(workout);
  const exerciseCount = workout?.exerciseCount || 0;
  const rows = workout
    ? [
        {
          label: workout.firstExercise || 'Open assigned plan',
          meta: exerciseCount ? `${exerciseCount} exercise${exerciseCount === 1 ? '' : 's'}` : 'Plan detail',
          complete,
        },
        { label: 'Coach review', meta: workout.assignmentType || 'assignment', complete },
        { label: 'Progress proof', meta: complete ? 'Logged today' : 'Save after training', complete },
      ]
    : [];
  const actionLabel = !workout
    ? 'View Workouts'
    : complete
      ? 'Review Workout History'
      : workout.assignmentType === 'trainer_session' && !workout.isLoggable
        ? 'View Schedule'
        : workout.ctaLabel || 'Open Workout';

  return {
    kicker: workout?.assignmentType === 'trainer_session' ? 'Trainer session' : "Today's assignment",
    title: loading ? 'Loading assignment' : workout?.title || (error ? 'Assignment unavailable' : 'Plan pending'),
    meta: workout ? [workout.primaryPlanLabel, workout.weekNumber ? `Week ${workout.weekNumber}` : '', workout.dayNumber ? `Day ${workout.dayNumber}` : ''].filter(Boolean).join(' / ') || 'Ready now' : 'Your trainer has not assigned a live plan yet.',
    rows,
    actionPath: assignmentPath(workout),
    actionLabel,
    complete,
    empty: !loading && !error && !workout,
    loading: !!loading,
    error: !!error,
  };
}

export function buildSessionPreview({
  session,
  loading,
  error,
}: {
  session?: Session | null;
  loading?: boolean;
  error?: boolean;
}): SessionPreview {
  if (!session) {
    return {
      title: loading ? 'Loading session' : error ? 'Session unavailable' : 'No upcoming session',
      date: error ? 'Refresh schedule' : 'Not booked yet',
      time: 'Book your next training session',
      coach: 'Coach pending',
      path: '/dashboard/client/schedule',
      empty: !loading && !error,
      loading: !!loading,
      error: !!error,
    };
  }
  const start = new Date(String(session.start || session.sessionDate));
  const end = session.end ? new Date(String(session.end)) : new Date(start.getTime() + (session.duration || 60) * 60000);
  const coach = [session.trainer?.firstName, session.trainer?.lastName].filter(Boolean).join(' ') || 'Coach assigned';
  return {
    title: typeof session.sessionType === 'string' ? session.sessionType : session.sessionType?.name || 'Training Session',
    date: Number.isFinite(start.getTime()) ? start.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) : 'Scheduled',
    time: Number.isFinite(start.getTime()) ? `${start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Time pending',
    coach,
    path: '/dashboard/client/schedule',
    empty: false,
    loading: false,
    error: false,
  };
}

export function buildInsights(proof: HomeTrainingProof, progressPercent: number, streakDays: number): InsightRow[] {
  const volumeTarget = WEEKLY_GOAL * MINUTES_PER_WORKOUT_GOAL;
  const volumePct = clampDashboardPercent((proof.minutesThisWeek / volumeTarget) * 100);
  // Panel launch review 2026-08-03 (gap a): the two "Not available" insight
  // tiles (Strength Score / Recovery — both wearable-dependent) are replaced
  // with insights computable from the client's REAL logged history. Reintroduce
  // wearable tiles only when a wearable source actually exists.
  const weekDeltaStatus = proof.weekDelta == null
    ? 'Building your baseline'
    : proof.weekDelta >= 0
      ? `Up ${proof.weekDelta} vs last week`
      : `${Math.abs(proof.weekDelta)} fewer than last week`;
  const bestRecentWeek = proof.weeklyCounts.length ? Math.max(...proof.weeklyCounts) : 0;
  return [
    { label: 'Workouts This Week', value: String(proof.thisWeekCount || 0), status: weekDeltaStatus, points: proof.weeklyCounts },
    { label: 'Training Volume', value: `${proof.minutesThisWeek || 0} min`, status: `${volumePct}% of weekly target`, points: proof.weeklyCounts },
    { label: 'Consistency', value: `${Math.min(streakDays, 30)}d`, status: `${clampDashboardPercent(progressPercent)}% level momentum`, points: proof.weeklyCounts },
    { label: 'Best Recent Week', value: `${bestRecentWeek} workout${bestRecentWeek === 1 ? '' : 's'}`, status: 'Highest of your last 4 weeks', points: proof.weeklyCounts },
  ];
}

export function buildPerformanceScore(proof: HomeTrainingProof, progressPercent: number, streakDays: number): number | null {
  if (!proof.thisWeekCount && !progressPercent && !streakDays) return null;
  const weekly = clampDashboardPercent((proof.thisWeekCount / WEEKLY_GOAL) * 100);
  const streak = clampDashboardPercent((Math.min(streakDays, 14) / 14) * 100);
  return Math.round((weekly * 0.45) + (clampDashboardPercent(progressPercent) * 0.35) + (streak * 0.2));
}

export function findClientRank(rows: HomeLeaderboardRow[], points: number, displayName: string): string {
  const lowerName = displayName.trim().toLowerCase();
  const index = rows.findIndex((row) => row.points === points || row.name.trim().toLowerCase() === lowerName);
  return index >= 0 ? `#${index + 1}` : 'Unranked';
}
