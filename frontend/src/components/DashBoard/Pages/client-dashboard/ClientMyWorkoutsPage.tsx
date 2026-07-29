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
  ChevronDown, ChevronUp, Weight, Zap, MessageCircle
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useWorkoutSessions } from '../../../../hooks/useDashboardQueries';
import ClientMyWorkoutsHeader from './ClientMyWorkoutsHeader';
import ClientMyWorkoutsNextMove from './ClientMyWorkoutsNextMove';
import ClientWorkoutPlanVaultPanel from './ClientWorkoutPlanVaultPanel';
import ClientTodayHero from './ClientTodayHero';
import ClientMyWorkoutsPagination from './ClientMyWorkoutsPagination';
import WorkoutLoggerChallengeReceipt from '../../../WorkoutLogger/WorkoutLoggerChallengeReceipt';
import {
  PageContainer, HeaderActions, LogBtn, StatsRow, StatCard, StatValue, StatLabel,
  WorkoutCard, WorkoutHeader, WorkoutInfo, WorkoutDate, WorkoutTitle, WorkoutMeta,
  MetaItem, ExpandBtn, WorkoutBody, ExerciseBlock, ExerciseName, SetTable, SetTableHead,
  SetTableRow, SetTh, SetTd, SetBadge, WorkoutNotes, NoSetsText, EmptyState, EmptyTitle,
  EmptyText, ErrorCard, RetryBtn, ShimmerCard,
  AccentIconSlot, StatIconSlot,
} from './ClientMyWorkoutsStyles';
import { buildClientWorkoutsCoachPath, CLIENT_WORKOUTS_PAGE_LIMIT, groupWorkoutLogsByExercise } from './ClientMyWorkoutsPage.logic';
import type { WorkoutSession } from './ClientMyWorkoutsPage.logic';
import type { ChallengeProgressImpactReceipt } from '../../../../services/nasmApiService';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// SECTION: Helpers
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// TanStack Query handles caching, deduplication, abort on unmount
// ─────────────────────────────────────────────────────────────

const ClientMyWorkoutsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  // Canonical pagination state. Canonical-surface-audit 2026-04-13: the prior
  // canonical consumer never sent page>1, so the backend controller's
  // page→offset translation (added earlier) was unreachable from real UI.
  // This state + the Next/Previous controls at the bottom of the list make
  // page 2+ reachable for clients with >50 logged workouts.
  const [page, setPage] = useState<number>(1);

  // TanStack Query: automatic caching + AbortController on unmount
  const { data: workouts = [] as WorkoutSession[], isLoading, error, refetch } = useWorkoutSessions({
    limit: CLIENT_WORKOUTS_PAGE_LIMIT,
    page,
  });
  const coachPath = useMemo(() => buildClientWorkoutsCoachPath({ workouts, page }), [page, workouts]);
  const workoutChallengeProgress = useMemo(() => {
    const state = location.state as { workoutChallengeProgress?: ChallengeProgressImpactReceipt | null } | null;
    return state?.workoutChallengeProgress ?? null;
  }, [location.state]);

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

  const pageHeader = <ClientMyWorkoutsHeader onNavigate={navigate} coachPath={coachPath} />;

  if (isLoading) {
    return (
      <PageContainer>
        {pageHeader}
        <ClientWorkoutPlanVaultPanel />
        <WorkoutLoggerChallengeReceipt progress={workoutChallengeProgress} />
        <ShimmerCard /><ShimmerCard /><ShimmerCard />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        {pageHeader}
        <ClientWorkoutPlanVaultPanel />
        <WorkoutLoggerChallengeReceipt progress={workoutChallengeProgress} />
        <ErrorCard>
          <p>Unable to load workouts. Please try again.</p>
          <RetryBtn onClick={() => refetch()}>Retry</RetryBtn>
        </ErrorCard>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {pageHeader}
      <ClientTodayHero />
      <ClientWorkoutPlanVaultPanel />
      <WorkoutLoggerChallengeReceipt progress={workoutChallengeProgress} />

      {workouts.length === 0 ? (
        // Empty branch splits by page to avoid the "empty-page trap" where
        // Next past the last real page returns [] and would otherwise strand
        // the user on a fake-empty state with no Previous control.
        <>
          <EmptyState>
            <AccentIconSlot $muted><Dumbbell size={48} /></AccentIconSlot>
            <EmptyTitle>
              {page > 1 ? 'End of history' : 'No workouts logged yet'}
            </EmptyTitle>
            <EmptyText>
              {page > 1
                ? 'No more workouts on this page. Use Previous to go back.'
                : 'Complete your first training session to see your workout history with detailed set breakdowns.'}
            </EmptyText>
            {page === 1 && (
              <HeaderActions aria-label="First workout actions">
                <LogBtn onClick={() => navigate('/dashboard/client/log-workout?loadPlan=today')}>
                  <Dumbbell size={16} /> Log Your First Workout
                </LogBtn>
                <LogBtn onClick={() => navigate(coachPath)} aria-label="Ask Coach what to log first">
                  <MessageCircle size={16} /> Ask Coach
                </LogBtn>
              </HeaderActions>
            )}
          </EmptyState>
          {page > 1 && (
            <ClientMyWorkoutsPagination
              page={page}
              currentPageCount={0}
              limit={CLIENT_WORKOUTS_PAGE_LIMIT}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => p + 1)}
            />
          )}
        </>
      ) : (
        <>
          {/* Stat cards reflect the CURRENT PAGE slice only, not lifetime
              totals — the canonical /api/workout/sessions endpoint does not
              return a total count, so labels are explicitly page-scoped to
              avoid the "Total Workouts = 7" misleading-data-truth regression
              called out in the canonical-surface-audit 2026-04-13 review. */}
          <StatsRow>
            <StatCard>
              <StatIconSlot><TrendingUp size={18} /></StatIconSlot>
              <StatValue>{totalWorkouts}</StatValue>
              <StatLabel>On This Page</StatLabel>
            </StatCard>
            <StatCard>
              <StatIconSlot><Calendar size={18} /></StatIconSlot>
              <StatValue>{thisWeek}</StatValue>
              <StatLabel>This Week (on page)</StatLabel>
            </StatCard>
            <StatCard>
              <StatIconSlot><Weight size={18} /></StatIconSlot>
              <StatValue>{totalVolume > 1000 ? `${(totalVolume / 1000).toFixed(1)}k` : totalVolume}</StatValue>
              <StatLabel>Page Volume (lbs)</StatLabel>
            </StatCard>
          </StatsRow>

          <ClientMyWorkoutsNextMove coachPath={coachPath} onNavigate={navigate} />

          {workouts.map((workout: WorkoutSession) => {
            const isExpanded = expandedIds.has(workout.id);
            const exerciseGroups = workout.logs ? groupWorkoutLogsByExercise(workout.logs) : {};
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

          <ClientMyWorkoutsPagination
            page={page}
            currentPageCount={workouts.length}
            limit={CLIENT_WORKOUTS_PAGE_LIMIT}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => p + 1)}
          />
        </>
      )}
    </PageContainer>
  );
};

export default ClientMyWorkoutsPage;
