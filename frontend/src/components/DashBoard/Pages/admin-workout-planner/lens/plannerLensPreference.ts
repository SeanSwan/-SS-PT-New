/**
 * plannerLensPreference.ts — S19. Per-operator lens choice, versioned-key +
 * validate-on-read (plannerViewMode/galleryViewPrefs precedent — this IS the
 * existing prefs pattern; no new endpoint). Unknown/retired ids degrade to
 * studio-classic, never throw.
 */
import { PLANNER_LENS_DEFAULT_ID, isRegisteredPlannerLensId, type PlannerLensId } from './registry';

const KEY = 'ss.planner.lens.v1';

export const readPlannerLensId = (): PlannerLensId => {
  try {
    const stored = window.localStorage.getItem(KEY);
    return stored && isRegisteredPlannerLensId(stored) ? stored : PLANNER_LENS_DEFAULT_ID;
  } catch {
    return PLANNER_LENS_DEFAULT_ID;
  }
};

export const writePlannerLensId = (id: PlannerLensId): void => {
  try {
    window.localStorage.setItem(KEY, id);
  } catch {
    /* private mode — the choice just won't stick */
  }
};
