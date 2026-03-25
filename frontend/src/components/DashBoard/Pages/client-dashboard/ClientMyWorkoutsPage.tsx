/**
 * ============================================================================
 * FILE: ClientMyWorkoutsPage.tsx
 * PURPOSE: Client workout history with per-set weight/rep detail view
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-24
 * AI VILLAGE VALIDATED: 2026-03-24
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Displays the client's completed workout sessions with
 * full per-set breakdown (weight, reps, tempo, RPE). Fetches from
 * GET /api/workout/sessions which includes WorkoutLog entries per set.
 *
 * HOW IT FITS IN THE APP: Client Dashboard → My Workouts tab
 * KEY DECISIONS: Per-set display (not aggregated) to show weight progression
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: ClientMyWorkoutsPage                             ║
 * ║  PURPOSE: Workout history with per-set detail                ║
 * ║  OWNER: Claude Opus 4.6                                      ║
 * ║  LAST VALIDATED: 2026-03-24                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────────────────────────┐
 * │ My Workouts                               [Log Workout]    │
 * ├────────────────────────────────────────────────────────────┤
 * │ ┌─ Total ─┐ ┌─ This Week ─┐ ┌─ Volume ──────────────┐    │
 * │ │   24     │ │      3       │ │   45,200 lbs          │    │
 * │ └─────────┘ └─────────────┘ └────────────────────────┘    │
 * ├────────────────────────────────────────────────────────────┤
 * │ ▼ Mar 24, 2026 — Full Body Workout (60 min, 8/10)         │
 * │   Barbell Bench Press ★★★★☆                                │
 * │   Set 1: 185 lbs × 10 reps  Tempo: 4/2/1  RPE: 7         │
 * │   Set 2: 195 lbs ×  8 reps  Tempo: 4/2/1  RPE: 8         │
 * │   Set 3: 205 lbs ×  6 reps  Tempo: 4/2/1  RPE: 9         │
 * │                                                            │
 * │   Dumbbell Rows ★★★★★                                      │
 * │   Set 1:  40 lbs × 12 reps  RPE: 6                        │
 * │   Set 2:  45 lbs × 10 reps  RPE: 7                        │
 * └────────────────────────────────────────────────────────────┘
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dumbbell, Calendar, Clock, Flame, TrendingUp,
  ChevronDown, ChevronUp, Star, Weight, Zap
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  PageContainer, Header, Title, LogBtn, StatsRow, StatCard, StatValue, StatLabel,
  WorkoutCard, WorkoutHeader, WorkoutInfo, WorkoutDate, WorkoutTitle, WorkoutMeta,
  MetaItem, ExpandBtn, WorkoutBody, ExerciseBlock, ExerciseName, SetTable, SetTableHead,
  SetTableRow, SetTh, SetTd, SetBadge, WorkoutNotes, NoSetsText, EmptyState, EmptyTitle,
  EmptyText, ErrorCard, RetryBtn, ShimmerCard,
} from './ClientMyWorkoutsStyles';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

interface WorkoutLog {
  id: number;
  exerciseName: string;
  setNumber: number;
  reps: number;
  weight: number;
  tempo?: string;
  rest?: number;
  rpe?: number;
  notes?: string;
}

interface WorkoutSession {
  id: string;
  title?: string;
  date: string;
  duration?: number;
  intensity?: number;
  totalSets?: number;
  totalReps?: number;
  totalWeight?: number;
  notes?: string;
  status?: string;
  logs?: WorkoutLog[];
}

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const ClientMyWorkoutsPage: React.FC = () => {
  const { authAxios } = useAuth();
  const navigate = useNavigate();
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const fetchWorkouts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await authAxios.get('/api/workout/sessions', {
        params: { limit: 50, page: 1 }
      });
      const payload = res.data?.data;
      const list = Array.isArray(payload?.workouts)
        ? payload.workouts
        : Array.isArray(payload) ? payload : [];
      setWorkouts(list);
    } catch {
      setError('Unable to load workouts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  useEffect(() => { fetchWorkouts(); }, [fetchWorkouts]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Group logs by exercise name
  const groupLogs = (logs: WorkoutLog[]) => {
    const groups: Record<string, WorkoutLog[]> = {};
    for (const log of logs) {
      const key = log.exerciseName || 'Unknown Exercise';
      if (!groups[key]) groups[key] = [];
      groups[key].push(log);
    }
    // Sort sets within each exercise
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => a.setNumber - b.setNumber);
    }
    return groups;
  };

  // Compute stats
  const totalWorkouts = workouts.length;
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thisWeek = workouts.filter(w => new Date(w.date) >= weekAgo).length;
  const totalVolume = workouts.reduce((sum, w) => sum + (w.totalWeight || 0), 0);

  if (loading) {
    return (
      <PageContainer>
        <ShimmerCard /><ShimmerCard /><ShimmerCard />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <ErrorCard>
          <p>{error}</p>
          <RetryBtn onClick={fetchWorkouts}>Retry</RetryBtn>
        </ErrorCard>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Header>
        <Title><Dumbbell size={22} style={{ color: 'var(--accent-primary, #60C0F0)' }} /> My Workouts</Title>
        <LogBtn onClick={() => navigate('/dashboard/workouts/logger')}>
          <Dumbbell size={16} /> Log Workout
        </LogBtn>
      </Header>

      {workouts.length === 0 ? (
        <EmptyState>
          <Dumbbell size={48} style={{ opacity: 0.3, color: 'var(--accent-primary, #60C0F0)' }} />
          <EmptyTitle>No workouts logged yet</EmptyTitle>
          <EmptyText>Complete your first training session to see your workout history with detailed set breakdowns.</EmptyText>
          <LogBtn onClick={() => navigate('/dashboard/workouts/logger')}>
            <Dumbbell size={16} /> Log Your First Workout
          </LogBtn>
        </EmptyState>
      ) : (
        <>
          <StatsRow>
            <StatCard>
              <TrendingUp size={18} style={{ color: 'var(--accent-primary, #60C0F0)' }} />
              <StatValue>{totalWorkouts}</StatValue>
              <StatLabel>Total Workouts</StatLabel>
            </StatCard>
            <StatCard>
              <Calendar size={18} style={{ color: 'var(--accent-primary, #60C0F0)' }} />
              <StatValue>{thisWeek}</StatValue>
              <StatLabel>This Week</StatLabel>
            </StatCard>
            <StatCard>
              <Weight size={18} style={{ color: 'var(--accent-primary, #60C0F0)' }} />
              <StatValue>{totalVolume > 1000 ? `${(totalVolume / 1000).toFixed(1)}k` : totalVolume}</StatValue>
              <StatLabel>Total Volume (lbs)</StatLabel>
            </StatCard>
          </StatsRow>

          {workouts.map(workout => {
            const isExpanded = expandedIds.has(workout.id);
            const exerciseGroups = workout.logs ? groupLogs(workout.logs) : {};
            const exerciseNames = Object.keys(exerciseGroups);
            const dateStr = new Date(workout.date).toLocaleDateString(undefined, {
              weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
            });

            return (
              <WorkoutCard key={workout.id}>
                <WorkoutHeader onClick={() => toggleExpand(workout.id)}>
                  <WorkoutInfo>
                    <WorkoutDate>{dateStr}</WorkoutDate>
                    <WorkoutTitle>{workout.title || 'Workout Session'}</WorkoutTitle>
                    <WorkoutMeta>
                      {workout.duration && <MetaItem><Clock size={14} /> {workout.duration} min</MetaItem>}
                      {workout.intensity && <MetaItem><Flame size={14} /> {workout.intensity}/10</MetaItem>}
                      {workout.totalSets && <MetaItem><Zap size={14} /> {workout.totalSets} sets</MetaItem>}
                    </WorkoutMeta>
                  </WorkoutInfo>
                  <ExpandBtn aria-label={isExpanded ? 'Collapse' : 'Expand'}>
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </ExpandBtn>
                </WorkoutHeader>

                {isExpanded && (
                  <WorkoutBody>
                    {exerciseNames.length === 0 ? (
                      <NoSetsText>No exercise data recorded for this session.</NoSetsText>
                    ) : (
                      exerciseNames.map(exName => {
                        const sets = exerciseGroups[exName];
                        return (
                          <ExerciseBlock key={exName}>
                            <ExerciseName>
                              <Dumbbell size={16} /> {exName}
                            </ExerciseName>
                            <SetTable>
                              <SetTableHead>
                                <SetTableRow>
                                  <SetTh>Set</SetTh>
                                  <SetTh>Weight</SetTh>
                                  <SetTh>Reps</SetTh>
                                  <SetTh className="hide-mobile">Tempo</SetTh>
                                  <SetTh className="hide-mobile">RPE</SetTh>
                                  <SetTh className="hide-mobile">Rest</SetTh>
                                </SetTableRow>
                              </SetTableHead>
                              <tbody>
                                {sets.map(set => (
                                  <SetTableRow key={set.id || set.setNumber}>
                                    <SetTd><SetBadge>{set.setNumber}</SetBadge></SetTd>
                                    <SetTd $highlight>{set.weight ? `${set.weight} lbs` : '—'}</SetTd>
                                    <SetTd $highlight>{set.reps || '—'}</SetTd>
                                    <SetTd className="hide-mobile">{set.tempo || '—'}</SetTd>
                                    <SetTd className="hide-mobile">{set.rpe ? `${set.rpe}/10` : '—'}</SetTd>
                                    <SetTd className="hide-mobile">{set.rest ? `${set.rest}s` : '—'}</SetTd>
                                  </SetTableRow>
                                ))}
                              </tbody>
                            </SetTable>
                          </ExerciseBlock>
                        );
                      })
                    )}
                    {workout.notes && (
                      <WorkoutNotes>
                        <strong>Notes:</strong> {workout.notes}
                      </WorkoutNotes>
                    )}
                  </WorkoutBody>
                )}
              </WorkoutCard>
            );
          })}
        </>
      )}
    </PageContainer>
  );
};

export default ClientMyWorkoutsPage;

// Styled components extracted to ClientMyWorkoutsStyles.ts per 300-line rule
