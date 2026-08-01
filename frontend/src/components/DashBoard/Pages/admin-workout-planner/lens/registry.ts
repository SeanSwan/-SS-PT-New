/**
 * registry.ts — S19 (JARVIS blueprint §5.4). The Planner Lens registry:
 * id → { name, blurb, load }. `studio-classic` is statically imported — the
 * fallback floor must never depend on a lazy chunk resolving. Every other
 * lens is lazy-loaded (L10) and its entry lands WITH its slice (S20: 2-5 ·
 * S21: 6-10) — an unregistered id never renders and the host falls back to
 * studio-classic.
 */
import type { PlannerLensComponent } from './slots';
import StudioClassic from './styles/studio-classic';

export type PlannerLensId =
  | 'studio-classic' | 'thumb-deck' | 'ledger-grid' | 'card-stack' | 'week-ribbon'
  | 'coach-console' | 'blueprint' | 'focus-lane' | 'rolodex-first' | 'signal-board';

export interface PlannerLensRegistryEntry {
  id: PlannerLensId;
  name: string;
  blurb: string;
  /** studio-classic resolves synchronously; lazy lenses return an import(). */
  load: () => Promise<{ default: PlannerLensComponent }> | { default: PlannerLensComponent };
}

export const PLANNER_LENS_DEFAULT_ID: PlannerLensId = 'studio-classic';

export const plannerLensRegistry: Partial<Record<PlannerLensId, PlannerLensRegistryEntry>> = {
  'studio-classic': {
    id: 'studio-classic',
    name: 'Studio Classic',
    blurb: 'The proven three-panel studio — exactly as today.',
    load: () => ({ default: StudioClassic }),
  },
};

export const isRegisteredPlannerLensId = (id: string): id is PlannerLensId =>
  Object.prototype.hasOwnProperty.call(plannerLensRegistry, id);
