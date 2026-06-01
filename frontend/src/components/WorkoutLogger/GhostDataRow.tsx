/**
 * ┌─── SUB-COMPONENT: GhostDataRow ──────────────────────────┐
 * │ PARENT: ExerciseCardComponent                              │
 * │ PURPOSE: Shows previous workout data as faded "ghost" row  │
 * │ above each set for easy reference and PR detection          │
 * │ WIREFRAME:                                                 │
 * │ ┌──────────────────────────────────────────────┐           │
 * │ │ 👻 Last: 135lbs × 10  RPE 7  Rest 60s       │           │
 * │ └──────────────────────────────────────────────┘           │
 * │ Props: { exerciseName, clientId, setIndex }                │
 * │ CLICK-OUTCOMES: None (read-only display)                   │
 * └────────────────────────────────────────────────────────────┘
 */

import React, { useEffect, useState, useRef } from 'react';
import styled from 'styled-components';
import { CS, withAlpha } from './WorkoutLoggerCS';
import apiService from '../../services/api.service';

interface GhostSet {
  setNumber: number;
  weight: number;
  reps: number;
  rpe?: number;
  tempo?: string;
  restTime?: number;
}

interface GhostDataRowProps {
  exerciseName: string;
  clientId: number;
  setIndex: number;
  /**
   * When true, the component becomes a no-op: no network request fires
   * and nothing renders. Used on the client self-log route (Phase 16.2
   * round 12) where the underlying `/api/admin/clients/:id/workouts`
   * endpoint is admin-only and 403s for client sessions. Ghost data is
   * a speed/UX feature, not correctness — skipping it keeps the client
   * route clean of forbidden requests.
   *
   * This mirrors the `skip` option on `useGhostPreFill`; both share the
   * same API endpoint and the same client-route avoidance rule.
   */
  skip?: boolean;
}

// Cache to avoid refetching same exercise history
const ghostCache = new Map<string, GhostSet[] | null>();

const GhostDataRow: React.FC<GhostDataRowProps> = React.memo(({
  exerciseName,
  clientId,
  setIndex,
  skip = false,
}) => {
  const [ghostSet, setGhostSet] = useState<GhostSet | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    // Round 12 (2026-04-18): bail before any network path. Kept inside
    // the effect so the component doesn't conditionally call hooks.
    if (skip) return;
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const cacheKey = `${clientId}:${exerciseName}`;
    const cached = ghostCache.get(cacheKey);

    if (cached !== undefined) {
      setGhostSet(cached?.[setIndex] || null);
      return;
    }

    // Fetch last workout for this exercise
    apiService.get<{ success?: boolean; workouts?: any[] }>(
      `/api/admin/clients/${clientId}/workouts?limit=10`,
      { validateStatus: (status) => status < 500 },
    )
      .then(response => response.status < 400 ? response.data : null)
      .then(data => {
        if (!data?.success || !data.workouts) {
          ghostCache.set(cacheKey, null);
          return;
        }

        // Find most recent workout containing this exercise
        for (const workout of data.workouts) {
          const logs = workout.logs || workout.exercises || [];
          const matchingLogs = logs.filter(
            (log: any) => log.exerciseName?.toLowerCase() === exerciseName.toLowerCase()
          );

          if (matchingLogs.length > 0) {
            const sets: GhostSet[] = matchingLogs.map((log: any) => ({
              setNumber: log.setNumber || 1,
              weight: log.weight || 0,
              reps: log.reps || 0,
              rpe: log.rpe,
              tempo: log.tempo,
              restTime: log.rest || log.restTime,
            }));
            ghostCache.set(cacheKey, sets);
            setGhostSet(sets[setIndex] || null);
            return;
          }
        }

        ghostCache.set(cacheKey, null);
      })
      .catch(() => {
        ghostCache.set(cacheKey, null);
      });
  }, [exerciseName, clientId, setIndex, skip]);

  if (!ghostSet) return null;

  return (
    <GhostRow aria-label={`Previous: ${ghostSet.weight}lbs × ${ghostSet.reps} reps`}>
      <GhostLabel>Last:</GhostLabel>
      <GhostValue>{ghostSet.weight}lbs</GhostValue>
      <GhostSep>×</GhostSep>
      <GhostValue>{ghostSet.reps} reps</GhostValue>
      {ghostSet.rpe && (
        <>
          <GhostSep>|</GhostSep>
          <GhostValue>RPE {ghostSet.rpe}</GhostValue>
        </>
      )}
      {ghostSet.tempo && (
        <>
          <GhostSep>|</GhostSep>
          <GhostValue>{ghostSet.tempo}</GhostValue>
        </>
      )}
    </GhostRow>
  );
});

GhostDataRow.displayName = 'GhostDataRow';
export default GhostDataRow;

// ── Styled Components ──

const GhostRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.75rem;
  margin-bottom: 0.25rem;
  background: ${withAlpha(CS.gaming, 0.04)};
  border-radius: 0.375rem;
  border-left: 2px solid ${withAlpha(CS.gaming, 0.15)};
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  opacity: 0.5;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.8;
  }
`;

const GhostLabel = styled.span`
  color: ${withAlpha(CS.text, 0.4)};
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.65rem;
`;

const GhostValue = styled.span`
  color: ${CS.glow};
  font-weight: 500;
`;

const GhostSep = styled.span`
  color: ${withAlpha(CS.text, 0.3)};
`;
