/**
 * COMPONENT: WorkoutDayDrilldown
 * OWNER: Client Dashboard / Progress (Slice 8.4 — chart drill-down)
 * PURPOSE: Tap a chart point, see the exact workout behind it — set-level
 *          truth (exercise, reps, weight, RPE) for one training day.
 * DATA: GET /api/client/analytics/workout-day?md=MM/DD (JWT-derived user).
 * A11Y: role=dialog + aria-modal, Escape closes, focus moves to the close
 *       button on open and returns to the opener on close (WCAG 2.4.3).
 * STATES: loading skeleton / error note / empty day note / grouped sessions.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Clock, X } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import {
  CloseButton,
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
interface DayDetail { date: string | null; sessions: DrillSession[] }

export const formatSet = (set: DrillSet): string => {
  const reps = set.reps !== null ? `${set.reps} reps` : 'reps n/a';
  const weight = set.weight !== null ? ` x ${set.weight} lb` : '';
  const rpe = set.rpe !== null ? `  RPE ${set.rpe}` : '';
  return `${reps}${weight}${rpe}`;
};

const WorkoutDayDrilldown: React.FC<{ md: string; onClose: () => void }> = ({ md, onClose }) => {
  const { authAxios } = useAuth();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [detail, setDetail] = useState<DayDetail | null>(null);
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
    authAxios
      .get(`/api/client/analytics/workout-day?md=${encodeURIComponent(md)}`)
      .then((res: { data?: { success?: boolean; data?: DayDetail } }) => {
        if (!isMounted) return;
        if (res?.data?.success && res.data.data) {
          setDetail(res.data.data);
          setStatus('ready');
        } else {
          setStatus('error');
        }
      })
      .catch(() => { if (isMounted) setStatus('error'); });
    return () => { isMounted = false; };
  }, [authAxios, md]);

  return (
    <Overlay onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <Panel role="dialog" aria-modal="true" aria-label={`Workout detail for ${md}`}>
        <PanelHeader>
          <div>
            <PanelTitle>Workout — {md}</PanelTitle>
            <PanelSub>{detail?.date ?? 'from your logged history'}</PanelSub>
          </div>
          <CloseButton ref={closeRef} type="button" onClick={onClose} aria-label="Close workout detail">
            <X size={18} aria-hidden="true" />
          </CloseButton>
        </PanelHeader>

        {status === 'loading' && <DrillSkeleton data-testid="drilldown-skeleton" aria-hidden="true" />}

        {status === 'error' && (
          <StateNote role="status">Could not load this workout right now.</StateNote>
        )}

        {status === 'ready' && detail && detail.sessions.length === 0 && (
          <StateNote role="status">No logged exercise detail for this day.</StateNote>
        )}

        {status === 'ready' && detail && detail.sessions.map((session) => (
          <SessionBlock key={session.id} data-testid="drilldown-session">
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
        ))}
      </Panel>
    </Overlay>
  );
};

export default WorkoutDayDrilldown;
