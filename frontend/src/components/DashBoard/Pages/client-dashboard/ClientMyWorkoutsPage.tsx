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
 * KEY DECISIONS: Per-set display (not aggregated) to show weight progression.
 * Uses TanStack Query for caching + automatic AbortController on unmount.
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

import React, { useState, useMemo, useCallback } from 'react';
import {
  Dumbbell, Calendar, Clock, Flame, TrendingUp,
  ChevronDown, ChevronUp, Star, Weight, Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWorkoutSessions } from '../../../../hooks/useDashboardQueries';
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
// SECTION: Helpers
// ─────────────────────────────────────────────────────────────

// Group logs by exercise name, sort sets within each exercise
function groupLogs(logs: WorkoutLog[]): Record<string, WorkoutLog[]> {
  const groups: Record<string, WorkoutLog[]> = {};
  for (const log of logs) {
    const key = log.exerciseName || 'Unknown Exercise';
    if (!groups[key]) groups[key] = [];
    groups[key].push(log);
  }
  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => a.setNumber - b.setNumber);
  }
  return groups;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// TanStack Query handles caching, deduplication, abort on unmount
// ─────────────────────────────────────────────────────────────

const ClientMyWorkoutsPage: React.FC = () => {
  const navigate = useNavigate();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // TanStack Query: automatic caching + AbortController on unmount
  const { data: workouts = [] as WorkoutSession[], isLoading, error, refetch } = useWorkoutSessions({ limit: 50 });

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Memoize expensive stats computation (was flagged by AI Village)
  const { totalWorkouts, thisWeek, totalVolume } = useMemo(() => {
    const total = workouts.length;
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const week = workouts.filter((w: WorkoutSession) => new Date(w.date) >= weekAgo).length;
    const volume = workouts.reduce((sum: number, w: WorkoutSession) => sum + (w.totalWeight || 0), 0);
    return { totalWorkouts: total, thisWeek: week, totalVolume: volume };
  }, [workouts]);

  if (isLoading) {
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
          <p>Unable to load workouts. Please try again.</p>
          <RetryBtn onClick={() => refetch()}>Retry</RetryBtn>
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

          {workouts.map((workout: WorkoutSession) => {
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
