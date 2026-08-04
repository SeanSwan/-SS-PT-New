import React, { useMemo } from 'react';
import styled from 'styled-components';
import { CheckCircle2, CalendarDays, Repeat2, Sparkles } from 'lucide-react';
import AITerminalPanel from '../Shared/AITerminalPanel';
import type { AIRequestContext } from '../../hooks/useAIChat';
import type { AITerminalQuickPrompt } from '../Shared/AITerminalPanel.types';

interface WorkoutLoggerCoachTerminalProps {
  clientId?: number;
  equipmentProfileId?: number | null;
  workoutDate?: string | null;
  scheduledSessionId?: string | null;
  scheduledSessionDate?: string | null;
  scheduledSessionCreditHint?: number | null;
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
  exerciseCount,
  selfMode = false,
}) => {
  const dateLabel = labelForDate(scheduledSessionDate || workoutDate);
  const workoutSubject = selfMode ? 'your workout' : 'the selected client';
  const scopedWorkout = selfMode ? `your ${dateLabel} workout` : `this selected client's ${dateLabel} workout`;
  const scopedSession = selfMode ? `your ${dateLabel} session` : `this selected client's ${dateLabel} session`;
  const hasStartedWorkout = exerciseCount > 0;
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

  const buildPrompt = useMemo(() => (
    `Build a logger-ready NASM workout for ${workoutSubject} on ${dateLabel}. `
    + 'Add exercises into this open Workout Logger with AI_ADD_EXERCISE action blocks. '
    + 'Include sets, reps, tempo, rest, warmup, cooldown, and safety notes. Do not submit or save the workout.'
  ), [dateLabel, workoutSubject]);

  const saveCheckPrompt = useMemo(() => (
    `Check this ${dateLabel} workout log before saving. Call out missing sets, intensity, session notes, pain flags, and anything that should be reviewed. Do not submit or save the workout.`
  ), [dateLabel]);

  const addMissingPrompt = useMemo(() => (
    `Review ${scopedWorkout} and only add exercises that are missing from the open Workout Logger. Keep existing logged exercises intact, use AI_ADD_EXERCISE action blocks only for missing work, and do not submit or save the workout.`
  ), [scopedWorkout]);

  const initialPrompt = hasStartedWorkout ? saveCheckPrompt : buildPrompt;

  const quickPrompts = useMemo<AITerminalQuickPrompt[]>(() => [
    ...(hasStartedWorkout ? [{
      label: 'Finish log',
      description: 'Check gaps before save',
      prompt: saveCheckPrompt,
      sendImmediately: true,
    }] : [{
      label: 'Build into log',
      description: 'One tap, review before save',
      prompt: buildPrompt,
      sendImmediately: true,
    }]),
    {
      label: 'Adjust safely',
      description: 'Swaps with exact targets',
      prompt: `Adjust ${scopedWorkout} for safety. Keep the same training intent, use AI_UPDATE_SET action blocks for exact changes to existing rows, and use AI_ADD_EXERCISE only when a replacement is clearly needed. Do not submit or save the workout.`,
      sendImmediately: true,
    },
    {
      label: 'Load phase',
      description: 'OPT template into logger',
      prompt: `Load the best NASM OPT phase template for ${scopedSession} into the open Workout Logger using AI_LOAD_TEMPLATE if the phase is clear. Use AI_TOGGLE_NASM_ITEM action blocks for warmup, balance_core, or cooldown selections that should be preselected. If phase is not clear, ask one short question first.`,
      sendImmediately: true,
    },
    {
      label: hasStartedWorkout ? 'Add missing work' : 'Save-check',
      description: hasStartedWorkout ? 'No duplicate rebuilds' : 'No silent submit',
      prompt: hasStartedWorkout ? addMissingPrompt : saveCheckPrompt,
      sendImmediately: true,
    },
  ], [addMissingPrompt, buildPrompt, hasStartedWorkout, saveCheckPrompt, scopedSession, scopedWorkout]);

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
      </StripHeader>

      <AITerminalPanel
        context="workout_generation"
        clientId={clientId}
        equipmentProfileId={equipmentProfileId}
        requestContext={requestContext}
        label="Workout Logger Coach"
        placeholder="Ask for today's workout, safe swaps, set targets, or save-check notes..."
        emptyHint={hasStartedWorkout
          ? 'Finish the log, make safe swaps, and check gaps before saving.'
          : 'Build the plan, make swaps, and review the log from this workout screen.'}
        initialPrompt={initialPrompt}
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
