/**
 * CONTEXT: PlannerDataContext (S15 — JARVIS blueprint §4.7)
 * Owns READ state: client roster/selection, plan content, generation status,
 * equipment profiles, rolodex query state, saved plans. Lenses/panels read
 * here; every WRITE lives in PlannerActionsContext. Never fetch from a
 * consumer — data enters only via WorkoutPlannerProvider's orchestration.
 */
import { createContext, useContext } from 'react';
import type { PlannerDataValue } from './WorkoutPlannerProvider';

export const PlannerDataContext = createContext<PlannerDataValue | null>(null);

export const usePlannerData = (): PlannerDataValue => {
  const value = useContext(PlannerDataContext);
  if (!value) throw new Error('usePlannerData must be used inside WorkoutPlannerProvider');
  return value;
};
