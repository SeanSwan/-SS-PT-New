import React, { useMemo } from 'react';
import styled from 'styled-components';
import { ArrowUpRight, CheckCircle2, CalendarDays, Repeat2, Sparkles } from 'lucide-react';
import AITerminalPanel from '../Shared/AITerminalPanel';
import { useAuth } from '../../context/AuthContext';
import type { AIRequestContext } from '../../hooks/useAIChat';
import type { AITerminalQuickPrompt } from '../Shared/AITerminalPanel.types';
import { buildWorkoutLoggerCoachRoute } from './workoutLoggerCoachRoute';

interface WorkoutLoggerCoachTerminalProps {
  clientId?: number;
  equipmentProfileId?: number | null;
  workoutDate?: string | null;
  scheduledSessionId?: string | null;
  scheduledSessionDate?: string | null;
  scheduledSessionCreditHint?: number | null;
  coachCommandRoute?: string | null;
  exerciseCount: number;
  selfMode?: boolean;
}

const labelForDate = (date?: string | null): string =>
  date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : 'today';

const isoDateOrNull = (date?: string | null): string | null =>
  date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;

const exerciseCountLabel = (count: number): string =>
  count === 1 ? '1 exercise in log' : `${count} exercises in log`;

const WorkoutLoggerCoachTerminal: React.FC<WorkoutLoggerCoachTerminalProps> = ({
  clientId,
  equipmentProfileId,
  workoutDate,
  scheduledSessionId,
  scheduledSessionDate,
  scheduledSessionCreditHint,
  coachCommandRoute,
  exerciseCount,
  selfMode = false,
}) => {
  const { user } = useAuth();
  const dateLabel = labelForDate(scheduledSessionDate || workoutDate);
  const workoutSubject = selfMode ? 'your workout' : 'the selected client';
  const scopedWorkout = selfMode ? `your ${dateLabel} workout` : `this selected client's ${dateLabel} workout`;
  const scopedSession = selfMode ? `your ${dateLabel} session` : `this selected client's ${dateLabel} session`;
  const resolvedCoachCommandRoute = useMemo(() => coachCommandRoute ?? buildWorkoutLoggerCoachRoute({
    userRole: user?.role,
    clientId,
    selfMode,
    workoutDate,
    scheduledSessionId,
    scheduledSessionDate,
    scheduledSessionCreditHint,
  }), [
    clientId,
    coachCommandRoute,
    scheduledSessionCreditHint,
    scheduledSessionDate,
    scheduledSessionId,
    selfMode,
    user?.role,
    workoutDate,
  ]);

  const requestContext = useMemo<AIRequestContext | null>(() => {
    const selectedWorkoutDate = isoDateOrNull(scheduledSessionDate) || isoDateOrNull(workoutDate);
    const contextPayload: AIRequestContext = {
      ...(selectedWorkoutDate ? { workoutDate: selectedWorkoutDate } : {}),
      ...(scheduledSessionId ? { scheduledSessionId } : {}),
      ...(scheduledSessionDate ? { scheduledSessionDate } : {}),
      ...(scheduledSessionCreditHint ? { scheduledSessionCredits: scheduledSessionCreditHint } : {}),
    };
    return Object.keys(contextPayload).length ? contextPayload : null;
  }, [scheduledSessionCreditHint, scheduledSessionDate, scheduledSessionId, workoutDate]);

  const basePrompt = useMemo(() => (
    `Build a logger-ready NASM workout for ${workoutSubject} on ${dateLabel}. `
    + 'Add exercises into this open Workout Logger with AI_ADD_EXERCISE action blocks. '
    + 'Include sets, reps, tempo, rest, warmup, cooldown, and safety notes. Do not submit or save the workout.'
  ), [dateLabel, workoutSubject]);

  const quickPrompts = useMemo<AITerminalQuickPrompt[]>(() => [
    {
      label: 'Build into log',
      description: 'One tap, review before save',
      prompt: basePrompt,
      sendImmediately: true,
    },
    {
      label: 'Adjust safely',
      description: 'Swaps with exact targets',
      prompt: `Adjust ${scopedWorkout} for safety. Keep the same training intent, list exact replacements with sets, reps, tempo, and rest, and only add new exercises into the open logger when a replacement is clearly needed.`,
      sendImmediately: true,
    },
    {
      label: 'Load phase',
      description: 'OPT template into logger',
      prompt: `Load the best NASM OPT phase template for ${scopedSession} into the open Workout Logger using AI_LOAD_TEMPLATE if the phase is clear. If it is not clear, ask one short question first.`,
      sendImmediately: true,
    },
    {
      label: 'Save-check',
      description: 'No silent submit',
      prompt: `Check this ${dateLabel} workout log before saving. Call out missing sets, intensity, session notes, pain flags, and anything that should be reviewed. Do not submit or save the workout.`,
      sendImmediately: true,
    },
  ], [basePrompt, scopedSession, scopedWorkout]);

  return (
    <CommandStrip aria-label="Workout logger Swan Coach command strip">
      <StripHeader>
        <StripTitle>
          <Sparkles size={16} aria-hidden="true" />
          <span>Swan Coach workout command</span>
        </StripTitle>
        <ContextPills aria-label="Workout command context">
          <ContextPill>
            <CalendarDays size={14} aria-hidden="true" />
            {dateLabel}
          </ContextPill>
          {scheduledSessionId && (
            <ContextPill>
              <CheckCircle2 size={14} aria-hidden="true" />
              Booked session
            </ContextPill>
          )}
          <ContextPill>
            <Repeat2 size={14} aria-hidden="true" />
            {exerciseCountLabel(exerciseCount)}
          </ContextPill>
        </ContextPills>
        {resolvedCoachCommandRoute && (
          <CommandCenterLink
            href={resolvedCoachCommandRoute}
            aria-label="Open full Coach Command Center for this workout"
          >
            <span>Full Command Center</span>
            <ArrowUpRight size={15} aria-hidden="true" />
          </CommandCenterLink>
        )}
      </StripHeader>

      <AITerminalPanel
        context="workout_generation"
        clientId={clientId}
        equipmentProfileId={equipmentProfileId}
        requestContext={requestContext}
        label="Workout Logger Coach"
        placeholder="Ask for today's workout, safe swaps, set targets, or save-check notes..."
        emptyHint="Build the plan, make swaps, and review the log from this workout screen."
        initialPrompt={basePrompt}
        quickPrompts={quickPrompts}
        defaultOpen
      />
    </CommandStrip>
  );
};

export default WorkoutLoggerCoachTerminal;

const CommandStrip = styled.section`
  border: 1px solid var(--workout-coach-strip-border, #60c0f033);
  border-radius: 16px;
  background:
    linear-gradient(135deg, var(--workout-coach-strip-bg-a, #002060e6), var(--workout-coach-strip-bg-b, #141419f2));
  box-shadow: 0 18px 50px var(--workout-coach-strip-shadow, #00000059);
  padding: 12px;
  margin-bottom: 16px;

  @media (max-width: 430px) {
    border-radius: 12px;
    padding: 10px;
  }
`;

const StripHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 10px;
`;

const CommandCenterLink = styled.a`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid var(--workout-coach-command-link-border, #60c0f04d);
  border-radius: 10px;
  background: linear-gradient(
    135deg,
    var(--workout-coach-command-link-bg-a, #60c0f024),
    var(--workout-coach-command-link-bg-b, #8b5cf624)
  );
  color: var(--workout-coach-command-link-text, #e0ecf4);
  font-size: 0.78rem;
  font-weight: 800;
  line-height: 1;
  padding: 0 12px;
  text-decoration: none;
  white-space: nowrap;
  box-shadow: 0 10px 28px var(--workout-coach-command-link-shadow, #00000033);
  transition: border-color 0.18s ease, transform 0.18s ease, background 0.18s ease;

  &:hover,
  &:focus-visible {
    border-color: var(--workout-coach-command-link-hover-border, #c6a84b);
    background: linear-gradient(
      135deg,
      var(--workout-coach-command-link-hover-bg-a, #60c0f038),
      var(--workout-coach-command-link-hover-bg-b, #8b5cf638)
    );
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--workout-coach-command-link-focus, #8b5cf6);
    outline-offset: 2px;
  }

  @media (max-width: 430px) {
    width: 100%;
  }
`;

const StripTitle = styled.h2`
  margin: 0;
  color: var(--workout-coach-title, #e0ecf4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.95rem;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  gap: 8px;

  svg {
    color: var(--workout-coach-title-icon, #60c0f0);
  }
`;

const ContextPills = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
`;

const ContextPill = styled.span`
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--workout-coach-pill-border, #c6a84b3d);
  border-radius: 999px;
  background: var(--workout-coach-pill-bg, #c6a84b1a);
  color: var(--workout-coach-pill-text, #e0ecf4);
  padding: 6px 10px;
  font-size: 0.76rem;
  font-weight: 700;
  white-space: nowrap;
`;
