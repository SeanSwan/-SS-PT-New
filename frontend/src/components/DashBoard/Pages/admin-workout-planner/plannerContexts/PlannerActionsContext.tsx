/**
 * CONTEXT: PlannerActionsContext (S15 — JARVIS blueprint §4.7)
 * Owns ALL writes: generate, save/activate, load, rolodex filters, exercise
 * row edits, pdf, confirm/safety-gate acks. Lenses call these handlers and
 * never fetch or mutate planner state directly — the 409
 * SWAN_COACH_REVIEW_REQUIRED ack-retry contract is reachable only through
 * the handlers exposed here (behavior unchanged by S15).
 */
import { createContext, useContext } from 'react';
import type { PlannerActionsValue } from './WorkoutPlannerProvider';

export const PlannerActionsContext = createContext<PlannerActionsValue | null>(null);

export const usePlannerActions = (): PlannerActionsValue => {
  const value = useContext(PlannerActionsContext);
  if (!value) throw new Error('usePlannerActions must be used inside WorkoutPlannerProvider');
  return value;
};
