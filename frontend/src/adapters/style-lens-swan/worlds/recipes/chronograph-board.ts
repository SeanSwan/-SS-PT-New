/**
 * WORLD RECIPE — chronograph-board (technical) · Swan World Engine
 * ====================================================
 * DNA: a departures board driven by a mechanical movement; time is the only column.
 * Impossible optical phenomenon: escapements that tick BETWEEN frames — seen only as blur.
 * Signature motion: split-flap resolution on every value change, never a fade.
 * Surface fit: schedules, rest timers, session run-of-show.
 *
 * NOT YET IMPLEMENTED: this world declares no atmosphere, and the representation
 * layer animates nothing (proven by lensRepresentation.coverage.test.tsx). The
 * phenomenon and signature motion above are the DESIGN BRIEF for a later slice,
 * not a description of what renders today.
 *
 * Structural codeword (>= 3 axes from EVERY other world, measured on a rollout surface with
 * no chart slot — the strictest host): compact-technical-mono display / soft-sans body /
 * faceted-console surface / ledger-strips collection / glass-dock action /
 * telemetry-columns chart / operator-grid template.
 *
 * Law A: chrome stays Crystalline Swan; this world paints ONLY the setting via --world-*.
 * Colour tokens route through palette custom properties (var(--token, #fallback)); the
 * bespoke setting depth in world-panel is the sanctioned carve-out (worlds/lawA.test.ts).
 */
import type { RecipeV2 } from '../../../../core/style-lens-os/v2/recipeV2';
import { RECIPE_SHARED } from '../recipeShared';

export const CHRONOGRAPH_BOARD_RECIPE: RecipeV2 = {
  ...RECIPE_SHARED,
  id: 'swan.chronograph-board.v2',
  tokens: {
    'world-title-font': "700 clamp(26px, 3.1vw, 44px)/1.08 'Fira Code', monospace",
    'world-letter-spacing': '0.06em',
    'world-panel-radius': '2px',
    'world-row-radius': '2px',
    'world-dial-radius': '6px',
    'world-accent': 'var(--gilded-fern, #c6a84b)',
    'world-action': 'var(--royal-depth, #003080)',
    'world-panel': 'color-mix(in srgb, #0e1524 92%, transparent)',
    'world-row-columns': 'minmax(160px, 2fr) repeat(3, minmax(64px, 1fr))',
  },
  composition: {
    'desktop-enhanced': { template: 'operator-grid' },
    tablet: { template: 'operator-grid' },
    'mobile-minimal': { template: 'playfield-stack' },
  },
  components: {
    'text.display': { variant: 'compact-technical-mono' },
    'text.body': { variant: 'soft-sans' },
    'surface.card': { variant: 'faceted-console' },
    'collection.exercise': { variant: 'ledger-strips' },
    'action.primary': { variant: 'glass-dock' },
    'chart.progress': { variant: 'telemetry-columns', familiarity: 'expressive' },
  },
};
