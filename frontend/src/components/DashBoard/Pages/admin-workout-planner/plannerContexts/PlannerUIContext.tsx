/**
 * CONTEXT: PlannerUIContext (S15 — JARVIS blueprint §4.7)
 * Owns UI-mode state: teach-mode sidebar, status strip message, confirm
 * dialog request, safety-gate review overlay state. Presentation-only —
 * no plan data, no writes (those live in PlannerActionsContext).
 */
import { createContext, useContext } from 'react';
import type { PlannerUIValue } from './WorkoutPlannerProvider';

export const PlannerUIContext = createContext<PlannerUIValue | null>(null);

export const usePlannerUI = (): PlannerUIValue => {
  const value = useContext(PlannerUIContext);
  if (!value) throw new Error('usePlannerUI must be used inside WorkoutPlannerProvider');
  return value;
};
