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
  SectionTitle,
} from './WorkoutsTabStyles';
import { ShimmerCard } from './WorkoutsTabStates.styles';
import {
  calcStreak,
  extractWorkoutSessions,
  transformWorkoutLogs,
} from './WorkoutsTabTransformers';
import WorkoutsTabCharts from './WorkoutsTabCharts';
import WorkoutsTabEmptyState from './WorkoutsTabEmptyState';
import WorkoutsTabSummary from './WorkoutsTabSummary';
import { getPersonalLogWorkoutDashboardPath } from './swanCoachDashboardRoute';

export const WORKOUT_SESSIONS_API_PATH = '/api/workout/sessions';

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

  const navigateToLogger = useCallback(() => {
    navigate(getPersonalLogWorkoutDashboardPath());
  }, [navigate]);

  const fetchWorkouts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authAxios.get(WORKOUT_SESSIONS_API_PATH, {
        params: { limit: 200, page: 1 },
      });
      const list = extractWorkoutSessions(response.data?.data);

      setCategories(transformWorkoutLogs(list));
      setStreak(list.length === 0 ? 0 : calcStreak(list));
    } catch {
      setCategories([]);
      setError('Unable to load workout data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  useEffect(() => {
    fetchWorkouts();
  }, [fetchWorkouts]);

  const stats = useMemo(() => computeStats(categories), [categories]);
  const hasWorkoutHistory = categories.length > 0;
  const topExercise = useMemo(() => getTopExerciseName(categories), [categories]);
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
            <NextMoveTitle>Turn this history into today's plan</NextMoveTitle>
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
          <WorkoutsTabCharts categories={categories} />
        </>
      )}
    </Container>
  );
};

export default React.memo(WorkoutsTab);
