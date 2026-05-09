/**
 * COMPONENT: WorkoutsTab
 * PURPOSE: Active UserDashboard V3 exercise usage panel.
 * OWNER: Codex
 * LAST VALIDATED: 2026-05-09
 *
 * WIREFRAME:
 * [Exercise Usage] [Log Workout]
 * [Total Sets] [Most Active] [Day Streak]
 * [category charts or empty state]
 *
 * DATA FLOW:
 * Props In: none.
 * State: categories, loading, error, streak.
 * API Calls: GET /api/workout/sessions.
 * Children: WorkoutsTabSummary, WorkoutsTabCharts, WorkoutsTabEmptyState.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, Dumbbell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { computeStats, type CategoryData } from './WorkoutsTabData';
import {
  Container,
  ErrorCard,
  Header,
  LogButton,
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

export const WORKOUT_SESSIONS_API_PATH = '/api/workout/sessions';

const WorkoutsTab: React.FC = () => {
  const { authAxios } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);

  const navigateToLogger = useCallback(() => {
    navigate('/dashboard/admin-sessions');
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
        <LogButton type="button" onClick={navigateToLogger}>
          <Dumbbell size={16} />
          Log Workout
        </LogButton>
      </Header>

      {categories.length === 0 ? (
        <WorkoutsTabEmptyState onLogWorkout={navigateToLogger} />
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
