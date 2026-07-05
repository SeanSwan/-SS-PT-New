/**
 * COMPONENT: WorkoutDayDrilldown
 * OWNER: Client Dashboard / Progress (Slice 8.4 day mode; Slice 9 week mode)
 * PURPOSE: Tap a chart point, see the exact workout(s) behind it — set-level
 *          truth (exercise, reps, weight, RPE) for one training day, or a
 *          whole training week grouped per day.
 * DATA: GET /api/client/analytics/workout-day?md=MM/DD (mode="day")
 *       GET /api/client/analytics/workout-week?md=MM/DD (mode="week",
 *       md = the weekly chart's week-start label).
 * A11Y: role=dialog + aria-modal, Escape closes, focus moves to the close
 *       button on open and returns to the opener on close (WCAG 2.4.3).
 * STATES: loading skeleton / error note / empty note / grouped sessions.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Clock, X } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import {
  CloseButton,
  DayHeading,
  DrillSkeleton,
  ExerciseName,
  Overlay,
  Panel,
  PanelHeader,
  PanelSub,
  PanelTitle,
  SessionBlock,
  SessionMeta,
  SetIndex,
  SetRow,
  StateNote,
} from './WorkoutDayDrilldown.styles';

interface DrillSet { reps: number | null; weight: number | null; rpe: number | null }
interface DrillExercise { name: string; sets: DrillSet[] }
interface DrillSession {
  id: number | string;
  duration: number | null;
  startTime: string | null;
  exercises: DrillExercise[];
}
interface DrillDay { date: string | null; sessions: DrillSession[] }

export type DrilldownMode = 'day' | 'week';

export const formatSet = (set: DrillSet): string => {
  const reps = set.reps !== null ? `${set.reps} reps` : 'reps n/a';
  const weight = set.weight !== null ? ` x ${set.weight} lb` : '';
  const rpe = set.rpe !== null ? `  RPE ${set.rpe}` : '';
  return `${reps}${weight}${rpe}`;
};

/** Both endpoint payloads normalize to a list of day blocks. */
export const normalizeDrillPayload = (mode: DrilldownMode, data: unknown): DrillDay[] | null => {
  const d = data as { date?: string | null; sessions?: DrillSession[]; days?: DrillDay[] } | null;
  if (!d) return null;
  if (mode === 'week') return Array.isArray(d.days) ? d.days : null;
  return Array.isArray(d.sessions) ? [{ date: d.date ?? null, sessions: d.sessions }] : null;
};

const SessionView: React.FC<{ session: DrillSession }> = ({ session }) => (
  <SessionBlock data-testid="drilldown-session">
    <SessionMeta>
      <Clock size={13} aria-hidden="true" />
      {session.startTime ?? 'Session'}
      {session.duration !== null ? ` - ${session.duration} min` : ''}
    </SessionMeta>
    {session.exercises.length === 0 && (
      <StateNote role="status">Session logged without exercise detail.</StateNote>
    )}
    {session.exercises.map((exercise) => (
      <div key={exercise.name}>
        <ExerciseName>{exercise.name}</ExerciseName>
        {exercise.sets.map((set, i) => (
          <SetRow key={i}>
            <SetIndex>{`#${i + 1}`}</SetIndex>
            {formatSet(set)}
          </SetRow>
        ))}
      </div>
    ))}
  </SessionBlock>
);

const WorkoutDayDrilldown: React.FC<{
  md: string;
  onClose: () => void;
  mode?: DrilldownMode;
}> = ({ md, onClose, mode = 'day' }) => {
  const { authAxios } = useAuth();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [days, setDays] = useState<DrillDay[]>([]);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<Element | null>(null);

  useEffect(() => {
    openerRef.current = document.activeElement;
    closeRef.current?.focus();
    return () => {
      const opener = openerRef.current;
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    // Lock background scroll while the dialog is open (mobile especially).
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);

  useEffect(() => {
    if (!authAxios) { setStatus('error'); return; }
    let isMounted = true;
    setStatus('loading');
    const endpoint = mode === 'week' ? 'workout-week' : 'workout-day';
    authAxios
      .get(`/api/client/analytics/${endpoint}?md=${encodeURIComponent(md)}`)
      .then((res: { data?: { success?: boolean; data?: unknown } }) => {
        if (!isMounted) return;
        const normalized = res?.data?.success
          ? normalizeDrillPayload(mode, res.data.data)
          : null;
        if (normalized) {
          setDays(normalized);
          setStatus('ready');
        } else {
          setStatus('error');
        }
      })
      .catch(() => { if (isMounted) setStatus('error'); });
    return () => { isMounted = false; };
  }, [authAxios, md, mode]);

  const title = mode === 'week' ? `Week of ${md}` : `Workout — ${md}`;
  const totalSessions = days.reduce((sum, d) => sum + d.sessions.length, 0);

  return (
    <Overlay onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <Panel role="dialog" aria-modal="true" aria-label={`Workout detail for ${md}`}>
        <PanelHeader>
          <div>
            <PanelTitle>{title}</PanelTitle>
            <PanelSub>
              {mode === 'week' && status === 'ready'
                ? `${totalSessions} ${totalSessions === 1 ? 'session' : 'sessions'} logged`
                : days[0]?.date ?? 'from your logged history'}
            </PanelSub>
          </div>
          <CloseButton ref={closeRef} type="button" onClick={onClose} aria-label="Close workout detail">
            <X size={18} aria-hidden="true" />
          </CloseButton>
        </PanelHeader>

        {status === 'loading' && <DrillSkeleton data-testid="drilldown-skeleton" aria-hidden="true" />}

        {status === 'error' && (
          <StateNote role="status">Could not load this workout right now.</StateNote>
        )}

        {status === 'ready' && totalSessions === 0 && (
          <StateNote role="status">
            {mode === 'week'
              ? 'No logged workouts for this week.'
              : 'No logged exercise detail for this day.'}
          </StateNote>
        )}

        {status === 'ready' && days.map((day) => (
          <div key={day.date ?? 'day'}>
            {mode === 'week' && day.sessions.length > 0 && (
              <DayHeading>{day.date ?? 'Training day'}</DayHeading>
            )}
            {day.sessions.map((session) => (
              <SessionView key={session.id} session={session} />
            ))}
          </div>
        ))}
      </Panel>
    </Overlay>
  );
};

export default WorkoutDayDrilldown;
