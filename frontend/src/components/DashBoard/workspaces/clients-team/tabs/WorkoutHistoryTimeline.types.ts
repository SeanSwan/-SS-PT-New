/**
 * ============================================================================
 * FILE: WorkoutHistoryTimeline.types.ts
 * PURPOSE: Shape of the workout history a trainer reviews on the client tab —
 *          one workout, its per-set logs, and the component's own props.
 *
 * WHY SEPARATE: extracted from WorkoutHistoryTimeline.tsx (SWA-225 slice 4),
 * which sat at 308 lines against the 300-line cap in CLAUDE.md rule 4. Types
 * are the honest seam: the component file is about *behaviour* (fetch, expand,
 * edit, save), and the record shape is reusable by any sibling that renders or
 * edits the same history. Follows the established `<Component>.types.ts`
 * convention already used in this directory (ClientWorkoutPlansPanel.types.ts).
 *
 * NOTE ON WorkoutLog: `setType` and `isometricHoldSeconds` are the circuit /
 * drop-set fields added by migration 20260828000001-add-workout-log-circuit-fields
 * and written by adminWorkoutLoggerController. Both are optional here because a
 * log row predating that migration carries neither.
 * ============================================================================
 */

/** One logged set. Optional fields are genuinely absent on older rows, not null. */
export interface WorkoutLog {
  id: number;
  exerciseName: string;
  setNumber: number;
  reps: number;
  weight: number;
  tempo?: string;
  rest?: number;
  rpe?: number;
  notes?: string;
  circuitName?: string;
  circuitOrder?: number;
  exerciseRole?: string;
  setType?: string;
  isometricHoldSeconds?: number;
}

/** One completed session, with its set logs and pre-aggregated totals. */
export interface Workout {
  id: string;
  title: string;
  date: string;
  duration: number;
  intensity: number;
  status: string;
  totalSets: number;
  totalReps: number;
  totalWeight: number;
  logs: WorkoutLog[];
}

export interface WorkoutHistoryTimelineProps {
  clientId: number | string;
  clientName?: string;
}
