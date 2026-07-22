/**
 * ClientProgramShelf
 * ==================
 * The plan the member is ON, always visible on their home page — and the rest of
 * their programs on a shelf beneath it. Tapping any plan opens the full program
 * (ClientPlanDetailModal).
 *
 * "Always there no matter what" (Sean 2026-07-11): this component NEVER unmounts
 * itself. Loading, no-plan, and error all render in place — a member must never
 * open their home and find the plan simply gone.
 *
 * READ-ONLY BY DOCTRINE: status pills are read-outs, not controls. Only a trainer
 * switches which plan is active. Do not add a switch/activate/edit affordance here.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { CalendarRange, Check, ChevronRight, Dumbbell, Layers3, Sparkles } from 'lucide-react';
import type {
  ClientTrainingPlanSlot,
  ClientTrainingPlanVault,
  CurrentClientWorkout,
} from '../observatory/useCurrentClientWorkout';
import type { AssignmentView } from '../../../../UserDashboard/components/ClientDashboardHome.viewModel';
import ClientPlanDetailModal from './ClientPlanDetailModal';
import {
  EmptyCard,
  HeroActions,
  HeroCard,
  HeroKicker,
  HeroMeta,
  HeroTitle,
  NextUp,
  PrimaryAction,
  ProgressFill,
  ProgressRow,
  ProgressTrack,
  SecondaryAction,
  ShelfCard,
  ShelfCardMeta,
  ShelfCardTitle,
  ShelfHeader,
  ShelfPill,
  ShelfSection,
  ShelfTrack,
  SkeletonCard,
  TodayCard,
} from './ClientProgramShelf.styles';

export interface ClientProgramShelfProps {
  userId: unknown;
  workout?: CurrentClientWorkout | null;
  planVault?: ClientTrainingPlanVault | null;
  loading?: boolean;
  error?: boolean;
  showTodayAssignment?: boolean;
  /**
   * Today's session view (absorbed from the retired TodaysAssignmentCard,
   * Sean 2026-07-11 — two cards both narrating "today" was pure clutter).
   * Carries the done/not-done state AND the correct route: `actionPath` passes
   * assignmentKey/assignmentType to the logger, routes a completed session to
   * history, and a non-loggable trainer session to the schedule.
   */
  assignment?: AssignmentView | null;
  /** Router navigate — used for the assignment's own resolved actionPath. */
  onNavigate?: (path: string) => void;
}

const pillTone = (status?: string): 'paused' | 'ready' | 'done' => {
  const value = (status || '').toLowerCase();
  if (value === 'completed') return 'done';
  if (value === 'paused') return 'paused';
  return 'ready';
};

const pillLabel = (status?: string): string => {
  const value = (status || '').toLowerCase();
  if (value === 'completed') return 'Completed';
  if (value === 'paused') return 'Paused';
  if (value === 'draft') return 'Draft';
  return 'Ready';
};

/** Plans other than the active one — the shelf. Only real (filled) plans. */
const shelfSlots = (vault?: ClientTrainingPlanVault | null): ClientTrainingPlanSlot[] =>
  (vault?.slots ?? []).filter((slot) => slot.isFilled && !slot.isPrimary && slot.planId != null);

const activeSlot = (vault?: ClientTrainingPlanVault | null): ClientTrainingPlanSlot | null =>
  (vault?.slots ?? []).find((slot) => slot.isPrimary && slot.planId != null) ?? null;

const ClientProgramShelf: React.FC<ClientProgramShelfProps> = ({
  userId,
  workout,
  planVault,
  loading = false,
  error = false,
  showTodayAssignment = true,
  assignment,
  onNavigate,
}) => {
  const [openPlanId, setOpenPlanId] = useState<string | number | null>(null);
  const [openPlanTitle, setOpenPlanTitle] = useState<string | undefined>(undefined);

  const active = useMemo(() => activeSlot(planVault), [planVault]);
  const others = useMemo(() => shelfSlots(planVault), [planVault]);

  const openPlan = useCallback((planId: string | number, title?: string) => {
    setOpenPlanId(planId);
    setOpenPlanTitle(title);
  }, []);

  const closePlan = useCallback(() => setOpenPlanId(null), []);

  const durationWeeks = active?.durationWeeks ?? 0;
  // CurrentClientWorkout exposes weekNumber / primaryPlanLabel (NOT currentWeek /
  // planTitle) — the plan slot is the primary source, the workout the fallback.
  const currentWeek = active?.currentWeek ?? workout?.weekNumber ?? 1;
  const pct = durationWeeks > 0
    ? Math.min(100, Math.max(0, Math.round((currentWeek / durationWeeks) * 100)))
    : 0;
  const activeTitle =
    active?.planTitle || active?.label || workout?.primaryPlanLabel || 'Your training plan';
  const nextExercise = workout?.firstExercise;
  const exerciseCount = workout?.exerciseCount ?? 0;

  const heroBody = () => {
    // Loading: hold the space. The card is never absent.
    if (loading && !active) return <SkeletonCard data-testid="program-shelf-skeleton" aria-hidden="true" />;

    // No active plan (new member, or between programs) — an invitation, not an error.
    // NOTE: deliberately NOT role="status". This is persistent, static content that
    // already sits in the reading order — an aria-live region would announce it on
    // every load AND register a page-wide status region (which is reserved here for
    // real transient proof, e.g. XP awards).
    if (!active) {
      return (
        <EmptyCard data-testid="program-shelf-empty">
          <CalendarRange size={22} aria-hidden="true" />
          <div>No plan assigned yet</div>
          <p>
            {error
              ? "We couldn't load your plans right now — pull back in a moment."
              : 'Your coach is building your program. It shows up here the moment it lands.'}
          </p>
          {/* W0.1 cold-start coaching: waiting on a plan never blocks the Core Loop — self-directed
              logging is live today, so the empty state's next best action is to log one. */}
          {!error && onNavigate && (
            <HeroActions>
              <PrimaryAction
                type="button"
                onClick={() => onNavigate('/dashboard/client/log-workout')}
                aria-label="Log a workout"
              >
                <Dumbbell size={15} aria-hidden="true" />
                Log a workout
              </PrimaryAction>
            </HeroActions>
          )}
        </EmptyCard>
      );
    }

    return (
      <HeroCard data-testid="program-shelf-hero">
        <HeroKicker><Sparkles size={12} aria-hidden="true" /> Your program</HeroKicker>
        <HeroTitle>{activeTitle}</HeroTitle>
        <HeroMeta>
          {durationWeeks > 0
            ? `Week ${currentWeek} of ${durationWeeks}`
            : 'In progress'}
          {active.currentDay ? ` · Day ${active.currentDay}` : ''}
        </HeroMeta>

        {durationWeeks > 0 && (
          <ProgressRow>
            <ProgressTrack
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Week ${currentWeek} of ${durationWeeks}`}
            >
              <ProgressFill $pct={pct} />
            </ProgressTrack>
            <span>{pct}%</span>
          </ProgressRow>
        )}

        <HeroActions>
          <SecondaryAction
            type="button"
            onClick={() => openPlan(active.planId as string | number, activeTitle)}
            aria-label="View your full training plan"
          >
            <Layers3 size={15} aria-hidden="true" />
            View plan
          </SecondaryAction>
        </HeroActions>
      </HeroCard>
    );
  };

  /**
   * TODAY — absorbed from the retired TodaysAssignmentCard (Sean 2026-07-11: two
   * cards both narrating "today" was clutter).
   *
   * Rendered as a SIBLING of the hero, never nested inside it: a member can have a
   * live assignment while their plan vault has no populated slot, and burying this
   * in the hero made today's session vanish in exactly that case — worse than the
   * clutter it replaced. Today's session is its own fact and stands on its own.
   */
  const todayStrip = () => {
    if (!assignment) return null;
    const proofCue = assignment.complete ? 'Logged today' : 'Save after training';
    return (
      <TodayCard data-testid="current-workout-card">
        <NextUp $done={assignment.complete}>
          {assignment.complete
            ? <Check size={14} aria-hidden="true" />
            : <Dumbbell size={14} aria-hidden="true" />}
          <span>
            <strong>{assignment.kicker}</strong>
            {' — '}
            {assignment.title}
            {/* Plan / week / day — the same truth the retired card carried. */}
            {assignment.meta ? ` · ${assignment.meta}` : ''}
            {assignment.empty || assignment.loading
              ? ''
              : ` · ${nextExercise || 'Open assigned plan'}`}
            {exerciseCount > 0 ? ` · ${exerciseCount} exercise${exerciseCount === 1 ? '' : 's'}` : ''}
          </span>
          {!assignment.empty && !assignment.loading && <small>{proofCue}</small>}
        </NextUp>
        {onNavigate && (
          /* The assignment resolves its OWN route: the logger (carrying assignmentKey
             + assignmentType), history if it's already logged, or the schedule for a
             non-loggable trainer session. A hardcoded ?loadPlan=today would drop those
             params and load the wrong session. */
          <HeroActions>
            <PrimaryAction
              type="button"
              onClick={() => onNavigate(assignment.actionPath)}
              aria-label={assignment.actionLabel}
            >
              <Dumbbell size={15} aria-hidden="true" />
              {assignment.actionLabel}
            </PrimaryAction>
          </HeroActions>
        )}
      </TodayCard>
    );
  };

  return (
    <ShelfSection aria-label="Your training programs" data-testid="client-program-shelf">
      {heroBody()}
      {showTodayAssignment ? todayStrip() : null}

      {others.length > 0 && (
        <>
          <ShelfHeader>
            <Layers3 size={13} aria-hidden="true" />
            Your other plans ({others.length})
          </ShelfHeader>
          {/* A row of real buttons — do NOT put role="listitem" on them: that
              overrides the implicit button role and stops assistive tech from
              announcing them as actionable. */}
          <ShelfTrack data-testid="program-shelf-track" aria-label="Your other training plans">
            {others.map((slot) => {
              const title = slot.planTitle || slot.label;
              return (
                <ShelfCard
                  key={String(slot.planId)}
                  type="button"
                  onClick={() => openPlan(slot.planId as string | number, title)}
                  aria-label={`View plan: ${title}`}
                >
                  <ShelfCardTitle>{title}</ShelfCardTitle>
                  <ShelfCardMeta>
                    {slot.durationWeeks ? `${slot.durationWeeks} weeks` : slot.label}
                  </ShelfCardMeta>
                  {/* Read-out only — your coach decides which plan is active. */}
                  <ShelfPill $tone={pillTone(slot.planStatus)}>{pillLabel(slot.planStatus)}</ShelfPill>
                  <ShelfCardMeta aria-hidden="true"><ChevronRight size={12} /> View</ShelfCardMeta>
                </ShelfCard>
              );
            })}
          </ShelfTrack>
        </>
      )}

      <ClientPlanDetailModal
        open={openPlanId != null}
        onClose={closePlan}
        userId={userId}
        planId={openPlanId}
        fallbackTitle={openPlanTitle}
        /* Same resolved route as the hero CTA — never a hardcoded ?loadPlan=today. */
        onLogToday={
          assignment && onNavigate && !assignment.empty && !assignment.complete
            ? () => onNavigate(assignment.actionPath)
            : undefined
        }
      />
    </ShelfSection>
  );
};

export default ClientProgramShelf;
