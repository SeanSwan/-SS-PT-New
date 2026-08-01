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
  'thumb-deck': {
    id: 'thumb-deck',
    name: 'Thumb Deck',
    blurb: 'Gym-floor mobile: bottom tabs, roomy rows, Coach up front.',
    load: () => import('./styles/thumb-deck'),
  },
  'ledger-grid': {
    id: 'ledger-grid',
    name: 'Ledger Grid',
    blurb: 'Dense desktop ledger — compact, tabular, zero motion.',
    load: () => import('./styles/ledger-grid'),
  },
  'card-stack': {
    id: 'card-stack',
    name: 'Card Stack',
    blurb: 'One day at a time; everything else is a toggle away.',
    load: () => import('./styles/card-stack'),
  },
  'week-ribbon': {
    id: 'week-ribbon',
    name: 'Week Ribbon',
    blurb: 'Program-first: a week strip drives the day below.',
    load: () => import('./styles/week-ribbon'),
  },
  'coach-console': {
    id: 'coach-console',
    name: 'Coach Console',
    blurb: 'Coach and Teach lead; the builder rides shotgun.',
    load: () => import('./styles/coach-console'),
  },
  blueprint: {
    id: 'blueprint',
    name: 'Blueprint',
    blurb: 'Print-calm single column, high contrast, no hover chrome.',
    load: () => import('./styles/blueprint'),
  },
  'focus-lane': {
    id: 'focus-lane',
    name: 'Focus Lane',
    blurb: 'One thing per screen, giant type, explicit Next and Back.',
    load: () => import('./styles/focus-lane'),
  },
  'rolodex-first': {
    id: 'rolodex-first',
    name: 'Rolodex First',
    blurb: 'The library is the hero; the session rides a bottom tray.',
    load: () => import('./styles/rolodex-first'),
  },
  'signal-board': {
    id: 'signal-board',
    name: 'Signal Board',
    blurb: 'Telemetry first — one chart, adherence at a glance.',
    load: () => import('./styles/signal-board'),
  },
};

export const isRegisteredPlannerLensId = (id: string): id is PlannerLensId =>
  Object.prototype.hasOwnProperty.call(plannerLensRegistry, id);
