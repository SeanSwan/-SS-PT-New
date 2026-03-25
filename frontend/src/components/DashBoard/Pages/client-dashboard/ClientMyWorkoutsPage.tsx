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
import styled from 'styled-components';
import {
  Dumbbell, Calendar, Clock, Flame, TrendingUp,
  ChevronDown, ChevronUp, Star, Weight, Zap
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

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

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const PageContainer = styled.div`
  padding: 1.5rem;
  max-width: 900px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const Title = styled.h2`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
`;

const LogBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  min-height: 44px;
  border: 1px solid var(--accent-primary, #60C0F0);
  border-radius: 10px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  color: var(--accent-primary, #60C0F0);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { background: color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent); }
  &:focus-visible { outline: 2px solid #60C0F0; outline-offset: 2px; }
`;

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
  @media (max-width: 600px) { grid-template-columns: 1fr; }
`;

const StatCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 1rem;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96,192,240,0.15));
  border-radius: 12px;
`;

const StatValue = styled.span`
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
`;

const StatLabel = styled.span`
  font-size: 0.75rem;
  color: var(--text-muted, #94a3b8);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const WorkoutCard = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96,192,240,0.12));
  border-radius: 12px;
  margin-bottom: 1rem;
  overflow: hidden;
`;

const WorkoutHeader = styled.button`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 1rem 1.25rem;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  min-height: 44px;
  color: var(--text-primary, #E0ECF4);
  &:hover { background: rgba(96,192,240,0.05); }
  &:focus-visible { outline: 2px solid #60C0F0; outline-offset: -2px; }
`;

const WorkoutInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const WorkoutDate = styled.span`
  font-size: 0.75rem;
  color: var(--accent-primary, #60C0F0);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const WorkoutTitle = styled.span`
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

const WorkoutMeta = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
`;

const MetaItem = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  color: var(--text-muted, #94a3b8);
`;

const ExpandBtn = styled.span`
  color: var(--text-muted, #94a3b8);
  flex-shrink: 0;
`;

const WorkoutBody = styled.div`
  padding: 0 1.25rem 1.25rem;
  border-top: 1px solid var(--border-soft, rgba(96,192,240,0.1));
`;

const ExerciseBlock = styled.div`
  margin-top: 1rem;
`;

const ExerciseName = styled.h4`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--accent-secondary, #8B5CF6);
  margin: 0 0 0.5rem 0;
`;

const SetTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  .hide-mobile { @media (max-width: 600px) { display: none; } }
`;

const SetTableHead = styled.thead``;

const SetTableRow = styled.tr`
  &:not(:last-child) { border-bottom: 1px solid rgba(96,192,240,0.08); }
`;

const SetTh = styled.th`
  text-align: left;
  padding: 6px 8px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted, #94a3b8);
`;

const SetTd = styled.td<{ $highlight?: boolean }>`
  padding: 8px;
  color: ${p => p.$highlight ? 'var(--text-primary, #E0ECF4)' : 'var(--text-secondary, #94a3b8)'};
  font-weight: ${p => p.$highlight ? 600 : 400};
  font-variant-numeric: tabular-nums;
`;

const SetBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent);
  color: var(--accent-primary, #60C0F0);
  font-size: 0.75rem;
  font-weight: 700;
`;

const WorkoutNotes = styled.div`
  margin-top: 1rem;
  padding: 0.75rem;
  background: rgba(96,192,240,0.05);
  border-radius: 8px;
  font-size: 0.85rem;
  color: var(--text-secondary, #94a3b8);
  strong { color: var(--text-primary, #E0ECF4); }
`;

const NoSetsText = styled.p`
  padding: 1rem 0;
  color: var(--text-muted, #94a3b8);
  font-style: italic;
  font-size: 0.875rem;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 3rem 1rem;
  text-align: center;
`;

const EmptyTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
`;

const EmptyText = styled.p`
  font-size: 0.9rem;
  color: var(--text-muted, #94a3b8);
  max-width: 400px;
  margin: 0;
`;

const ErrorCard = styled.div`
  padding: 2rem;
  text-align: center;
  background: var(--bg-elevated, #141419);
  border: 1px solid rgba(201,42,84,0.3);
  border-radius: 12px;
  color: var(--text-primary, #E0ECF4);
`;

const RetryBtn = styled.button`
  margin-top: 1rem;
  padding: 10px 24px;
  min-height: 44px;
  border: 1px solid var(--accent-primary, #60C0F0);
  border-radius: 8px;
  background: transparent;
  color: var(--accent-primary, #60C0F0);
  cursor: pointer;
  font-weight: 600;
  &:hover { background: rgba(96,192,240,0.1); }
`;

const shimmer = `
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
`;

const ShimmerCard = styled.div`
  height: 100px;
  margin-bottom: 1rem;
  border-radius: 12px;
  background: linear-gradient(90deg, var(--bg-elevated, #141419) 25%, rgba(96,192,240,0.08) 50%, var(--bg-elevated, #141419) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  ${shimmer}
`;
