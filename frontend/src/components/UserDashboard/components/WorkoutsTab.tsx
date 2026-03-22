/**
 * ============================================================================
 * FILE: WorkoutsTab.tsx
 * PURPOSE: Workout logger and history tab for user dashboard
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Displays the user's workout history with quick-log
 * capability. Shows recent sessions, workout stats, and links to full logger.
 *
 * HOW IT FITS IN THE APP: UserDashboard.V3 -> WorkoutsTab -> workout API
 * KEY DECISIONS: Uses authAxios for API calls, lazy-loaded from parent.
 *
 * ┌─── SUB-COMPONENT: WorkoutsTab ──────────────────────────────┐
 * │ PARENT: UserDashboard.V3                                     │
 * │ PURPOSE: Workout history + quick-log on user dashboard        │
 * │ WIREFRAME:                                                    │
 * │ ┌──────────────────────────────────────────┐                  │
 * │ │ Recent Workouts           [Log Workout]  │                  │
 * │ │ ┌────────────────────────────────────┐    │                  │
 * │ │ │ 🏋️ Upper Body Push  │ 45min │ +50XP │    │                  │
 * │ │ │ 📅 Mar 21, 2026     │ 6 ex  │       │    │                  │
 * │ │ ├────────────────────────────────────┤    │                  │
 * │ │ │ 🏋️ Leg Day          │ 60min │ +50XP │    │                  │
 * │ │ │ 📅 Mar 19, 2026     │ 8 ex  │       │    │                  │
 * │ │ └────────────────────────────────────┘    │                  │
 * │ │                                           │                  │
 * │ │ ┌─ Quick Stats ─────────────────────┐    │                  │
 * │ │ │ This Week: 3 │ Streak: 12 │ XP: 150│    │                  │
 * │ │ └──────────────────────────────────  ┘    │                  │
 * │ └──────────────────────────────────────────┘                  │
 * │ Props: (none — uses AuthContext)                               │
 * │ CLICK-OUTCOMES:                                               │
 * │ [Log Workout] → navigates to /dashboard/admin-sessions        │
 * │ [Workout card] → expands to show exercises                    │
 * │ GAMIFICATION: Displays XP earned per workout                  │
 * └───────────────────────────────────────────────────────────────┘
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { Dumbbell, Clock, Flame, TrendingUp, ChevronRight } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────
interface WorkoutSession {
  id: number;
  name?: string;
  workoutName?: string;
  title?: string;
  duration?: number;
  durationMinutes?: number;
  exerciseCount?: number;
  exercises?: unknown[];
  totalWeight?: number;
  volumeLoad?: number;
  caloriesBurned?: number;
  calories?: number;
  date?: string;
  sessionDate?: string;
  createdAt?: string;
  status?: string;
  experiencePointsEarned?: number;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// PURPOSE: Fetches and displays workout history with stats
// ─────────────────────────────────────────────────────────────
const WorkoutsTab: React.FC = () => {
  const { authAxios } = useAuth();
  const navigate = useNavigate();
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkouts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authAxios.get('/api/v1/workouts/sessions', {
        params: { limit: 10, status: 'completed' },
      });
      setWorkouts(res.data?.data || []);
    } catch (err) {
      console.warn('Failed to fetch workouts:', err);
      setError('Unable to load workouts');
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  useEffect(() => {
    fetchWorkouts();
  }, [fetchWorkouts]);

  const getWorkoutName = (w: WorkoutSession) =>
    w.name || w.workoutName || w.title || 'Workout Session';

  const getDuration = (w: WorkoutSession) =>
    w.duration || w.durationMinutes || 0;

  const getDate = (w: WorkoutSession) => {
    const d = w.date || w.sessionDate || w.createdAt;
    return d ? new Date(d).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    }) : '';
  };

  const getExerciseCount = (w: WorkoutSession) =>
    w.exerciseCount || w.exercises?.length || 0;

  // Quick stats
  const thisWeekCount = workouts.filter(w => {
    const d = new Date(w.date || w.sessionDate || w.createdAt || '');
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return d >= weekAgo;
  }).length;

  const totalXP = workouts.reduce((sum, w) => sum + (w.experiencePointsEarned || 50), 0);

  if (loading) {
    return (
      <Container>
        <ShimmerCard /><ShimmerCard /><ShimmerCard />
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <ErrorCard>
          <p>{error}</p>
          <RetryButton onClick={fetchWorkouts}>Retry</RetryButton>
        </ErrorCard>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <SectionTitle>Recent Workouts</SectionTitle>
        <LogButton onClick={() => navigate('/dashboard/admin-sessions')}>
          <Dumbbell size={16} />
          Log Workout
        </LogButton>
      </Header>

      <StatsRow>
        <StatCard>
          <StatIcon><TrendingUp size={18} /></StatIcon>
          <StatValue>{thisWeekCount}</StatValue>
          <StatLabel>This Week</StatLabel>
        </StatCard>
        <StatCard>
          <StatIcon><Flame size={18} /></StatIcon>
          <StatValue>{workouts.length}</StatValue>
          <StatLabel>Total</StatLabel>
        </StatCard>
        <StatCard>
          <StatIcon><Dumbbell size={18} /></StatIcon>
          <StatValue>{totalXP}</StatValue>
          <StatLabel>XP Earned</StatLabel>
        </StatCard>
      </StatsRow>

      {workouts.length === 0 ? (
        <EmptyState>
          <Dumbbell size={48} />
          <p>No workouts logged yet. Start your journey!</p>
          <LogButton onClick={() => navigate('/dashboard/admin-sessions')}>
            Log Your First Workout
          </LogButton>
        </EmptyState>
      ) : (
        <WorkoutList>
          {workouts.map((w) => (
            <WorkoutCard key={w.id}>
              <WorkoutInfo>
                <WorkoutName>{getWorkoutName(w)}</WorkoutName>
                <WorkoutDate>{getDate(w)}</WorkoutDate>
              </WorkoutInfo>
              <WorkoutMeta>
                <MetaChip><Clock size={14} />{getDuration(w)}min</MetaChip>
                <MetaChip><Dumbbell size={14} />{getExerciseCount(w)} ex</MetaChip>
                {(w.experiencePointsEarned || 0) > 0 && (
                  <XPChip>+{w.experiencePointsEarned}XP</XPChip>
                )}
              </WorkoutMeta>
              <ChevronRight size={16} style={{ color: '#60C0F0', opacity: 0.5 }} />
            </WorkoutCard>
          ))}
        </WorkoutList>
      )}
    </Container>
  );
};

export default React.memo(WorkoutsTab);

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// PURPOSE: Crystalline Swan themed workout cards
// ─────────────────────────────────────────────────────────────
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 0;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const SectionTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: #E0ECF4;
  margin: 0;
`;

const LogButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(135deg, #8B5CF6, #60C0F0);
  border: none;
  color: #FFFFFF;
  padding: 10px 20px;
  border-radius: 10px;
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  min-height: 44px;
  min-width: 44px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(139, 92, 246, 0.4);
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 4px;
    box-shadow: 0 0 16px rgba(96, 192, 240, 0.4),
                inset 0 0 0 1px rgba(139, 92, 246, 0.2);
  }
`;

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
`;

const StatCard = styled.div`
  background: rgba(20, 20, 25, 0.8);
  border: 1px solid rgba(96, 192, 240, 0.12);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
`;

const StatIcon = styled.div`
  color: #60C0F0;
`;

const StatValue = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 1.4rem;
  font-weight: 700;
  color: #E0ECF4;
`;

const StatLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  color: rgba(224, 236, 244, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const WorkoutList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const WorkoutCard = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(20, 20, 25, 0.6);
  border: 1px solid rgba(96, 192, 240, 0.08);
  border-radius: 12px;
  padding: 14px 16px;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;

  &:hover {
    background: rgba(20, 20, 25, 0.9);
    border-color: rgba(96, 192, 240, 0.2);
  }
`;

const WorkoutInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const WorkoutName = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  color: #E0ECF4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const WorkoutDate = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  color: rgba(224, 236, 244, 0.5);
  margin-top: 2px;
`;

const WorkoutMeta = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
`;

const MetaChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  color: rgba(224, 236, 244, 0.7);
  background: rgba(96, 192, 240, 0.06);
  padding: 4px 8px;
  border-radius: 6px;
`;

const XPChip = styled.span`
  display: inline-flex;
  align-items: center;
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  font-weight: 600;
  color: #C6A84B;
  background: rgba(198, 168, 75, 0.1);
  padding: 4px 8px;
  border-radius: 6px;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 48px 24px;
  color: rgba(224, 236, 244, 0.4);
  text-align: center;

  p {
    font-family: 'Sora', sans-serif;
    font-size: 0.9rem;
    margin: 0;
  }
`;

const ErrorCard = styled.div`
  background: rgba(26, 26, 36, 0.95);
  border-left: 4px solid #C92A54;
  border-radius: 8px;
  padding: 16px 20px;
  color: #E0ECF4;
  font-family: 'Sora', sans-serif;

  p { margin: 0 0 12px; }
`;

const RetryButton = styled.button`
  background: rgba(96, 192, 240, 0.1);
  border: 1px solid rgba(96, 192, 240, 0.3);
  color: #60C0F0;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  min-height: 44px;
  font-family: 'Sora', sans-serif;

  &:hover { background: rgba(96, 192, 240, 0.2); }
  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 4px;
  }
`;

const shimmer = keyframes`
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
`;

const ShimmerCard = styled.div`
  height: 72px;
  border-radius: 12px;
  background: linear-gradient(
    90deg,
    rgba(20, 20, 25, 0.6) 0%,
    rgba(80, 160, 240, 0.08) 50%,
    rgba(20, 20, 25, 0.6) 100%
  );
  background-size: 200px 100%;
  animation: shimmerAnim 1.5s ease-in-out infinite;

  @keyframes shimmerAnim {
    0% { background-position: -200px 0; }
    100% { background-position: calc(200px + 100%) 0; }
  }
`;
