/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ RecipeConfig — recipes are DATA, never implementations (M4).│
 * │ A recipe may override chrome + arrangement ONLY. Forbidden  │
 * │ by type: zone count, zone semantics, primary-action count,  │
 * │ copy, tap budget — none of those are expressible here.      │
 * │ Tokens are single-level `var(--token, #fallback)` refs so   │
 * │ the contrast audit can COMPUTE every pair (Kimi H6).        │
 * │ Source: SESSION-SHELL-HANDOFF-2026-07-30 §3 M4 + knobs.     │
 * └─────────────────────────────────────────────────────────────┘
 */
import type { RunnerStyleId } from '../../runnerStyles';

export interface RecipeTokens {
  /** The active seam — Swan Lens world accent drives it. */
  accent: string;
  /** Zone/card surface behind body text. */
  surface: string;
  /** Body text on `surface`. */
  text: string;
  /** Coach foreground — a LIGHTENED verified pair, never raw Wing Purple as text. */
  coachFg: string;
  /** Coach surface behind `coachFg`. */
  coachBg: string;
}

export interface RecipeAtmosphere {
  /** Swan Lens world id rendered behind the zones. */
  world: string;
  /**
   * Mandatory scrim guaranteeing ≥4.5:1 over the WORST animation frame —
   * World Immersion ships only with it (handoff §3 knobs).
   */
  scrimToken: '--swan-zone-scrim';
}

export interface RecipeConfig {
  id: RunnerStyleId;
  /** Zone 3 form: tabs (Focus Flow/Classic) · segmented (Ledger Pro) · sheet detents (Sheet Stack). */
  stageRail: 'tabs' | 'segmented' | 'detents';
  /** Zone 5 entry affordance: action-bar button or ≥768px edge tab. */
  coachEntry: 'bar' | 'edge-tab';
  /** Train-canvas stats strip default. */
  statsStrip: 'collapsed' | 'expanded';
  atmosphere?: RecipeAtmosphere;
  tokens: RecipeTokens;
}
