/**
 * ClientPlanDetailModal
 * =====================
 * The client taps a plan on their home page and sees THE WHOLE PROGRAM — every
 * week -> day -> exercise — with a "you are here" marker on the week and day
 * they're actually on. Until now no surface in the app rendered a structured
 * plan at all (only a PDF viewer), so a member could not see what they were
 * paying for without opening a document.
 *
 * READ-ONLY BY DOCTRINE (Sean 2026-07-11): the member may SEE every plan; only a
 * trainer switches which plan is active or edits its structure. The status pill
 * here is a READ-OUT, never a control. Do not add a switch/edit affordance.
 *
 * In-house modal: framer-motion / focus-trap-react are NOT installed, so the
 * entrance, focus-trap, scroll-lock and Escape/click-outside contract are
 * hand-rolled per the house WorkoutPlannerBlendDialog pattern (z-index 2200).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CalendarRange, ChevronDown, ChevronRight, Dumbbell, Loader2, X } from 'lucide-react';
import { useClientPlanDetail, type ClientPlanExercise, type ClientPlanWeek } from './useClientPlanDetail';
import {
  Body,
  CloseButton,
  DayCard,
  DayList,
  DayTitle,
  EmptyState,
  ErrorState,
  ExerciseMeta,
  ExerciseRow,
  Footer,
  FooterNote,
  GhostButton,
  Header,
  HereBadge,
  LoadingState,
  Overlay,
  Panel,
  PlanMeta,
  PlanTitle,
  PrimaryButton,
  StatusPill,
  TitleBlock,
  WeekBlock,
  WeekFocus,
  WeekHeader,
} from './ClientPlanDetailModal.styles';

export interface ClientPlanDetailModalProps {
  open: boolean;
  onClose: () => void;
  userId: unknown;
  planId: unknown;
  /** Shown while the full plan loads, so the header isn't blank. */
  fallbackTitle?: string;
  /** Tapped when the member wants to train the current session. */
  onLogToday?: () => void;
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const setCount = (sets: ClientPlanExercise['sets']): number | null => {
  if (Array.isArray(sets)) return sets.length;
  if (typeof sets === 'number' && Number.isFinite(sets)) return sets;
  return null;
};

/** "3 x 12 · 60s" — compact, monospace, scannable. Omits what it doesn't know. */
const exerciseMeta = (exercise: ClientPlanExercise): string => {
  const sets = setCount(exercise.sets);
  const reps = exercise.targetReps ?? exercise.reps;
  const bits: string[] = [];
  if (sets != null && reps != null && String(reps).trim()) bits.push(`${sets} x ${reps}`);
  else if (sets != null) bits.push(`${sets} sets`);
  else if (reps != null && String(reps).trim()) bits.push(`${reps} reps`);
  if (exercise.restSeconds) bits.push(`${exercise.restSeconds}s rest`);
  if (exercise.tempo) bits.push(String(exercise.tempo));
  return bits.join(' · ');
};

const exerciseLabel = (exercise: ClientPlanExercise, index: number): string =>
  (exercise.exerciseName || exercise.name || `Exercise ${index + 1}`).trim();

const ClientPlanDetailModal: React.FC<ClientPlanDetailModalProps> = ({
  open,
  onClose,
  userId,
  planId,
  fallbackTitle,
  onLogToday,
}) => {
  const { plan, loading, error } = useClientPlanDetail(userId, planId, open);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<Element | null>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const currentWeek = plan?.currentWeek ?? 1;
  const currentDay = plan?.currentDay ?? null;
  const isActive = (plan?.status ?? '').toLowerCase() === 'active';

  // Open the week the member is ON by default — that is the question they came
  // with ("what am I doing?"). Every other week collapses so a 12-week program
  // doesn't become a wall of text.
  useEffect(() => {
    if (!plan) return;
    setExpanded({ [currentWeek]: true });
  }, [plan, currentWeek]);

  // House dialog contract: focus in, restore opener on close, lock page scroll.
  useEffect(() => {
    if (!open) return undefined;
    openerRef.current = document.activeElement;
    closeRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
      const opener = openerRef.current;
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, [open]);

  // Escape closes; Tab is trapped inside the panel.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { onClose(); return; }
      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const toggleWeek = useCallback((weekNumber: number) => {
    setExpanded((current) => ({ ...current, [weekNumber]: !current[weekNumber] }));
  }, []);

  const weeks: ClientPlanWeek[] = useMemo(() => plan?.weeks ?? [], [plan]);
  const title = plan?.title || fallbackTitle || 'Training plan';
  const metaLine = [
    plan?.durationWeeks ? `${plan.durationWeeks} weeks` : null,
    weeks.length ? `${weeks.length} planned` : null,
    plan?.difficulty || null,
  ].filter(Boolean).join(' · ');

  if (!open) return null;

  return (
    <Overlay onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <Panel ref={panelRef} role="dialog" aria-modal="true" aria-label={`Training plan: ${title}`}>
        <Header>
          <TitleBlock>
            <PlanTitle>{title}</PlanTitle>
            {metaLine && <PlanMeta>{metaLine}</PlanMeta>}
            {plan?.status && (
              /* Read-out, not a control: the trainer decides which plan is active. */
              <StatusPill $active={isActive}>
                {isActive ? 'Active plan' : `${plan.status.charAt(0).toUpperCase()}${plan.status.slice(1)}`}
              </StatusPill>
            )}
          </TitleBlock>
          <CloseButton ref={closeRef} type="button" onClick={onClose} aria-label="Close plan">
            <X size={18} aria-hidden="true" />
          </CloseButton>
        </Header>

        <Body>
          {loading && (
            <LoadingState role="status" aria-live="polite">
              <Loader2 size={22} aria-hidden="true" />
              Loading your plan...
            </LoadingState>
          )}

          {!loading && error && (
            <ErrorState role="alert">
              <AlertTriangle size={26} aria-hidden="true" />
              We couldn&apos;t load this plan right now.
              <span>Close and try again in a moment.</span>
            </ErrorState>
          )}

          {!loading && !error && weeks.length === 0 && (
            <EmptyState role="status">
              <CalendarRange size={26} aria-hidden="true" />
              This plan doesn&apos;t have its weeks laid out yet.
              <span>Your coach is still building it out.</span>
            </EmptyState>
          )}

          {!loading && !error && weeks.map((week) => {
            const isCurrentWeek = week.weekNumber === currentWeek;
            const isOpen = Boolean(expanded[week.weekNumber]);
            return (
              <WeekBlock key={week.weekNumber} $current={isCurrentWeek}>
                <WeekHeader
                  type="button"
                  onClick={() => toggleWeek(week.weekNumber)}
                  aria-expanded={isOpen}
                  aria-label={`Week ${week.weekNumber}${isCurrentWeek ? ', your current week' : ''}`}
                >
                  {isOpen
                    ? <ChevronDown size={15} aria-hidden="true" />
                    : <ChevronRight size={15} aria-hidden="true" />}
                  Week {week.weekNumber}
                  {isCurrentWeek && <HereBadge>You are here</HereBadge>}
                  {week.focus && <WeekFocus>{week.focus}</WeekFocus>}
                </WeekHeader>

                {isOpen && (
                  <DayList>
                    {week.days.length === 0 && (
                      <DayCard><DayTitle>Rest week — no sessions planned.</DayTitle></DayCard>
                    )}
                    {week.days.map((day) => {
                      const isCurrentDay = isCurrentWeek && currentDay != null && day.dayNumber === currentDay;
                      return (
                        <DayCard key={day.id ?? `${week.weekNumber}-${day.dayNumber}`} $current={isCurrentDay}>
                          <DayTitle>
                            <Dumbbell size={13} aria-hidden="true" />
                            {day.dayName || day.name || `Day ${day.dayNumber}`}
                            {day.focus && <ExerciseMeta>{day.focus}</ExerciseMeta>}
                            {isCurrentDay && <HereBadge>Today</HereBadge>}
                          </DayTitle>
                          {day.exercises.length === 0
                            ? <ExerciseRow><span>No exercises listed for this day.</span></ExerciseRow>
                            : day.exercises.map((exercise, index) => {
                              const meta = exerciseMeta(exercise);
                              return (
                                <ExerciseRow key={exercise.id ?? `${day.dayNumber}-${index}`}>
                                  <span>{exerciseLabel(exercise, index)}</span>
                                  {meta && <ExerciseMeta>{meta}</ExerciseMeta>}
                                </ExerciseRow>
                              );
                            })}
                        </DayCard>
                      );
                    })}
                  </DayList>
                )}
              </WeekBlock>
            );
          })}
        </Body>

        <Footer>
          {/* Reinforces the coaching relationship rather than offering a control. */}
          <FooterNote>Your coach sets your plan. Ask them for changes any time.</FooterNote>
          <GhostButton type="button" onClick={onClose}>Close</GhostButton>
          {onLogToday && isActive && (
            <PrimaryButton type="button" onClick={onLogToday} aria-label="Log today's workout from this plan">
              <Dumbbell size={15} aria-hidden="true" />
              Log today
            </PrimaryButton>
          )}
        </Footer>
      </Panel>
    </Overlay>
  );
};

export default ClientPlanDetailModal;
