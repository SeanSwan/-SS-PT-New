/**
 * Blueprint: plannerViewMode (Workout-OS C7)
 * Purpose: the §12.2 ruling made real — GUIDED is the default for NEW plans
 * (Swan Coach proposes candidates per slot, human picks), POWER (dense
 * auto-canvas) is one toggle away, and the choice is remembered per
 * operator. Versioned-key + validate-on-read pattern (galleryViewPrefs
 * precedent); storage failures degrade to the guided default, never throw.
 * Keyed per OPERATOR (like the logger quick-mode pref), not per client.
 */
import type { SwanCoachGenerationMode } from './WorkoutPlannerGuidedCandidateTypes';

export type PlannerViewMode = 'guided' | 'power';

const KEY = 'ss.planner.view.v1';

export const readPlannerViewMode = (): PlannerViewMode => {
  try {
    return window.localStorage.getItem(KEY) === 'power' ? 'power' : 'guided';
  } catch {
    return 'guided';
  }
};

export const writePlannerViewMode = (mode: PlannerViewMode): void => {
  try {
    window.localStorage.setItem(KEY, mode);
  } catch {
    /* private mode / quota — preference just won't stick */
  }
};

/** The generation mode each view presets — users can still pick any mode. */
export const generationModeForPlannerView = (mode: PlannerViewMode): SwanCoachGenerationMode => (
  mode === 'guided' ? 'guide_me' : 'auto'
);
