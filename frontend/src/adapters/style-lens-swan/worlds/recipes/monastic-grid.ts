/**
 * WORLD RECIPE — monastic-grid (calm) · Swan World Engine
 * =============================================================
 * DNA: a scriptorium reduced to rule and margin; nothing is present that need not be.
 * Impossible optical phenomenon: a spotlight with no source — objects lit from INSIDE.
 * Signature motion: a single page-turn per state change, nothing else moves.
 * Surface fit: focus mode, single-task logging, distraction-free review.
 *
 * Structural codeword (>= 3 axes from EVERY other world, measured on a rollout surface with
 * no chart slot — the strictest host): monastic-quiet display / soft-sans body /
 * etched-stone surface / command-rows collection / glass-dock action / ring-gauge chart /
 * operator-grid template.
 *
 * Law A: chrome stays Crystalline Swan; this world paints ONLY the setting via --world-*.
 * Colour tokens route through palette custom properties (var(--token, #fallback)); the
 * bespoke setting depth in world-panel is the sanctioned carve-out (worlds/lawA.test.ts).
 */
import type { RecipeV2 } from '../../../../core/style-lens-os/v2/recipeV2';
import { RECIPE_SHARED } from '../recipeShared';

export const MONASTIC_GRID_RECIPE: RecipeV2 = {
  ...RECIPE_SHARED,
  id: 'swan.monastic-grid.v2',
  tokens: {
    'world-title-font': "500 clamp(26px, 3.2vw, 46px)/1.24 'Plus Jakarta Sans', sans-serif",
    'world-letter-spacing': '0.01em',
    'world-panel-radius': '4px',
    'world-row-radius': '2px',
    'world-dial-radius': '50%',
    'world-accent': 'var(--ice-wing, #60c0f0)',
    'world-action': 'var(--midnight-sapphire, #002060)',
    'world-panel': 'color-mix(in srgb, #12161f 94%, transparent)',
    'world-row-columns': 'minmax(180px, 2fr) repeat(4, minmax(70px, 1fr))',
  },
  composition: {
    'desktop-enhanced': { template: 'operator-grid' },
    tablet: { template: 'operator-grid' },
    'mobile-minimal': { template: 'playfield-stack' },
  },
  components: {
    'text.display': { variant: 'monastic-quiet' },
    'text.body': { variant: 'soft-sans' },
    'surface.card': { variant: 'etched-stone' },
    'collection.exercise': { variant: 'command-rows' },
    'action.primary': { variant: 'glass-dock' },
    'chart.progress': { variant: 'ring-gauge', familiarity: 'expressive' },
  },
};
