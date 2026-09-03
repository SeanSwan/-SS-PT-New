/**
 * COMPONENT: WorkoutsTab
 * PURPOSE: Active UserDashboard V3 exercise usage panel.
 * OWNER: Codex
 * LAST VALIDATED: 2026-05-09
 *
 * WIREFRAME:
 * [Exercise Usage] [Log Workout]
 * [Logged Moves] [Most Active] [Day Streak]
 * [category charts or empty state]
 *
 * DATA FLOW:
 * Props In: none.
 * State: categories, loading, error, streak.
 * API Calls: GET /api/workout/sessions.
 * Children: WorkoutsTabSummary, WorkoutsTabCharts, WorkoutsTabEmptyState.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, Dumbbell, MessageCircle, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import {
  buildUserDashboardTeachCoachRoute,
  buildUserWorkoutsCoachPrompt,
} from '../UserDashboardTeachCoachRoute';
import { computeStats, type CategoryData } from './WorkoutsTabData';
import {
  CoachButton,
  Container,
  ErrorCard,
  Header,
  HeaderActions,
  LogButton,
  NextMoveActions,
  NextMoveCopy,
  NextMoveEyebrow,
  NextMovePanel,
  NextMoveText,
  NextMoveTitle,
  RetryButton,
  LoadOlderRow,
  ExtensionErrorNote,
  SectionTitle,
} from './WorkoutsTabStyles';
import { ShimmerCard } from './WorkoutsTabStates.styles';
import {
  type RawSession,
  calcStreak,
  extractWorkoutSessions,
  transformWorkoutLogs,
} from './WorkoutsTabTransformers';
import WorkoutsTabCharts from './WorkoutsTabCharts';
import WorkoutsTabEmptyState from './WorkoutsTabEmptyState';
import WorkoutsTabSummary from './WorkoutsTabSummary';
import { getPersonalLogWorkoutDashboardPath } from './swanCoachDashboardRoute';

export const WORKOUT_SESSIONS_API_PATH = '/api/workout/sessions';
/**
 * One page of history. The tab used to ask for a hard 200 with no way to ask
 * for more and no signal that more existed, so a long-training member silently
 * saw a truncated history — and any trend drawn from it was confidently wrong
 * (Blueprint v2 S8 / D7).
 */
export const WORKOUT_PAGE_SIZE = 50;

const getTopExerciseName = (categories: CategoryData[]): string => {
  let topExercise = '';
  let topCount = 0;

  categories.forEach((category) => {
    category.exercises.forEach((exercise) => {
      if (exercise.count > topCount) {
        topExercise = exercise.name;
        topCount = exercise.count;
      }
    });
  });

  return topExercise;
};

const WorkoutsTab: React.FC = () => {
  const { authAxios } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [sessions, setSessions] = useState<RawSession[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // The page the NEXT extension should ask for. Explicit state, never derived
  // from sessions.length: a workout logged between two fetches shifts the
  // offset window, and length-arithmetic then duplicates or skips the boundary
  // row while the window label claims exactness.
  const [nextPage, setNextPage] = useState(2);
  // Extension failures get their OWN channel. `error` drives a full-screen
  // early return (see below), so routing an extension failure there would wipe
  // the very window this feature promises to preserve.
  const [extensionError, setExtensionError] = useState<string | null>(null);

  const navigateToLogger = useCallback(() => {
    navigate(getPersonalLogWorkoutDashboardPath());
  }, [navigate]);

  const fetchWorkouts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authAxios.get(WORKOUT_SESSIONS_API_PATH, {
        params: { limit: WORKOUT_PAGE_SIZE, page: 1 },
      });
      const list = extractWorkoutSessions(response.data?.data);

      setSessions(list);
      setNextPage(2);
      setExtensionError(null);
      setHasMore(Boolean(response.data?.data?.hasMore));
      setCategories(transformWorkoutLogs(list));
      setStreak(list.length === 0 ? 0 : calcStreak(list));
    } catch {
      setSessions([]);
      setHasMore(false);
      setCategories([]);
      setError('Unable to load workout data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  /**
   * Append the next page. Charts recompute over the WHOLE loaded window, so a
   * member who loads more history sees their trends extend rather than reset.
   */
  const loadOlder = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    try {
      setLoadingMore(true);
      setExtensionError(null);
      const response = await authAxios.get(WORKOUT_SESSIONS_API_PATH, {
        params: { limit: WORKOUT_PAGE_SIZE, page: nextPage },
      });
      const older = extractWorkoutSessions(response.data?.data);
      const merged = [...sessions, ...older];
      setSessions(merged);
      setNextPage((p) => p + 1);
      setHasMore(Boolean(response.data?.data?.hasMore));
      setCategories(transformWorkoutLogs(merged));
      setStreak(merged.length === 0 ? 0 : calcStreak(merged));
    } catch {
      // Its OWN channel, deliberately: `error` early-returns the whole tab, so
      // sending an extension failure there would delete the 50 workouts, charts
      // and streak the member is looking at. Only the extension failed.
      setExtensionError('Unable to load older workouts. Please try again.');
    } finally {
      setLoadingMore(false);
    }
  }, [authAxios, hasMore, loadingMore, nextPage, sessions]);

  useEffect(() => {
    fetchWorkouts();
  }, [fetchWorkouts]);

  const stats = useMemo(() => computeStats(categories), [categories]);
  const hasWorkoutHistory = categories.length > 0;
  const topExercise = useMemo(() => getTopExerciseName(categories), [categories]);
  // Say what the charts are drawn FROM. A trend over a truncated window that
  // does not admit its window is a claim the data cannot support.
  const windowLabel = hasMore
    ? `Showing your last ${sessions.length} workouts`
    : `Showing all ${sessions.length} workouts`;
  const workoutCoachPrompt = useMemo(() => buildUserWorkoutsCoachPrompt({
    hasHistory: hasWorkoutHistory,
    totalExerciseTouches: stats.totalExercises,
    mostActiveCategory: stats.mostActiveCategory,
    streak,
    topExercise,
  }), [hasWorkoutHistory, stats.mostActiveCategory, stats.totalExercises, streak, topExercise]);
  const navigateToCoach = useCallback(() => {
    navigate(buildUserDashboardTeachCoachRoute(workoutCoachPrompt));
  }, [navigate, workoutCoachPrompt]);
  const mostActiveLabel = stats.mostActiveCategory || 'your recent training';

  if (loading) {
    return <Container><ShimmerCard /><ShimmerCard /><ShimmerCard /></Container>;
  }

  if (error) {
    return (
      <Container>
        <ErrorCard>
          <p>{error}</p>
          <RetryButton type="button" onClick={fetchWorkouts}>Retry</RetryButton>
        </ErrorCard>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <SectionTitle>
          <BarChart3 size={20} color="var(--accent-primary, #60C0F0)" />
          Exercise Usage
        </SectionTitle>
        <HeaderActions aria-label="Workout actions">
          <LogButton type="button" onClick={navigateToLogger}>
            <Dumbbell size={16} />
            Log Workout
          </LogButton>
          <CoachButton type="button" aria-label="Ask Coach" onClick={navigateToCoach}>
            <MessageCircle size={16} />
            Ask Coach
          </CoachButton>
        </HeaderActions>
      </Header>

      {hasWorkoutHistory && (
        <NextMovePanel aria-label="Workout next best move">
          <NextMoveText>
            <NextMoveEyebrow>Next best move</NextMoveEyebrow>
            <NextMoveTitle>Turn this history into today&apos;s plan</NextMoveTitle>
            <NextMoveCopy>
              Coach gets {stats.totalExercises.toLocaleString()} logged exercise touches,
              a {mostActiveLabel} emphasis, your streak, and top movement before it answers.
            </NextMoveCopy>
          </NextMoveText>
          <NextMoveActions>
            <LogButton type="button" onClick={navigateToLogger} aria-label="Log today from workouts tab">
              <Target size={16} />
              Log Today
            </LogButton>
            <CoachButton type="button" onClick={navigateToCoach} aria-label="Ask Coach Next">
              <MessageCircle size={16} />
              Ask Coach Next
            </CoachButton>
          </NextMoveActions>
        </NextMovePanel>
      )}

      {categories.length === 0 ? (
        <WorkoutsTabEmptyState onAskCoach={navigateToCoach} onLogWorkout={navigateToLogger} />
      ) : (
        <>
          <WorkoutsTabSummary stats={stats} streak={streak} />
          <WorkoutsTabCharts categories={categories} windowLabel={windowLabel} />
          {hasMore && (
            <LoadOlderRow>
              <RetryButton type="button" onClick={loadOlder} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : 'Load older workouts'}
              </RetryButton>
            </LoadOlderRow>
          )}
          {extensionError && (
            <LoadOlderRow>
              <ExtensionErrorNote role="alert" data-testid="extension-error">
                {extensionError}
              </ExtensionErrorNote>
            </LoadOlderRow>
          )}
        </>
      )}
    </Container>
  );
};

export default React.memo(WorkoutsTab);
