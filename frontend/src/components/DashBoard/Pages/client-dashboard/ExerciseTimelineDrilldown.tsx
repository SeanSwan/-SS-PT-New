/**
 * COMPONENT: ExerciseTimelineDrilldown
 * OWNER: Client Dashboard / Progress (charter v3 4d — the Workout Rolodex)
 * PURPOSE: Tap an exercise in the frequency ranking, see its full logged
 *          history — heaviest set, reps, and set count per training day —
 *          as a flip-through timeline dialog.
 * DATA: GET /api/client/analytics/exercise-timeline?exercise=NAME
 * A11Y: role=dialog + aria-modal, Escape closes, focus starts on Close
 *       (the WorkoutDayDrilldown contract).
 */

import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { X } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import {
  CloseButton,
  DrillSkeleton,
  Overlay,
  Panel,
  PanelHeader,
  PanelSub,
  PanelTitle,
  SetIndex,
  SetRow,
  StateNote,
} from './WorkoutDayDrilldown.styles';

/** Full-row 44px tap target used by the frequency card's ranking rows. */
export const RolodexRowTap = styled.button`
  flex: 1;
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
    border-radius: 8px;
  }
`;

interface TimelinePoint {
  x: string;
  y: number;
  reps: number;
  sets: number;
}

const formatPoint = (point: TimelinePoint): string => {
  const load = point.y > 0 ? `${point.y} lb x ${point.reps || '?'} reps` : 'bodyweight';
  return `${load} - ${point.sets} set${point.sets === 1 ? '' : 's'}`;
};

const ExerciseTimelineDrilldown: React.FC<{
  exerciseName: string;
  onClose: () => void;
}> = ({ exerciseName, onClose }) => {
  const { authAxios } = useAuth();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [points, setPoints] = useState<TimelinePoint[]>([]);
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
    if (!authAxios) { setStatus('error'); return; }
    let isMounted = true;
    setStatus('loading');
    authAxios
      .get(`/api/client/analytics/exercise-timeline?exercise=${encodeURIComponent(exerciseName)}`)
      .then((res: { data?: { success?: boolean; data?: TimelinePoint[] } }) => {
        if (!isMounted) return;
        if (res?.data?.success && Array.isArray(res.data.data)) {
          setPoints(res.data.data);
          setStatus('ready');
        } else {
          setStatus('error');
        }
      })
      .catch(() => { if (isMounted) setStatus('error'); });
    return () => { isMounted = false; };
  }, [authAxios, exerciseName]);

  return (
    <Overlay onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <Panel role="dialog" aria-modal="true" aria-label={`History for ${exerciseName}`}>
        <PanelHeader>
          <div>
            <PanelTitle>{exerciseName}</PanelTitle>
            <PanelSub>
              {status === 'ready'
                ? `${points.length} logged day${points.length === 1 ? '' : 's'}`
                : 'from your logged history'}
            </PanelSub>
          </div>
          <CloseButton ref={closeRef} type="button" onClick={onClose} aria-label="Close exercise history">
            <X size={18} aria-hidden="true" />
          </CloseButton>
        </PanelHeader>

        {status === 'loading' && <DrillSkeleton data-testid="rolodex-skeleton" aria-hidden="true" />}
        {status === 'error' && (
          <StateNote role="status">Could not load this exercise history right now.</StateNote>
        )}
        {status === 'ready' && points.length === 0 && (
          <StateNote role="status">No logged sets for this exercise yet.</StateNote>
        )}

        {status === 'ready' && [...points].reverse().map((point) => (
          <SetRow key={point.x}>
            <SetIndex>{point.x}</SetIndex>
            {formatPoint(point)}
          </SetRow>
        ))}
      </Panel>
    </Overlay>
  );
};

export default ExerciseTimelineDrilldown;
