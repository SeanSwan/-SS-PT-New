/**
 * WORLD RECIPE — terrain-console (technical) · Swan World Engine
 * ======================================================
 * DNA: a survey console reading the athlete as landscape; load is elevation.
 * Impossible optical phenomenon: elevation lines that cast height as COLORED shadow.
 * Signature motion: contour lines redrawing as the selected window moves.
 * Surface fit: load management, capacity mapping, longitudinal comparison.
 *
 * Structural codeword (>= 3 axes from EVERY other world, measured on a rollout surface with
 * no chart slot — the strictest host): compact-technical-mono display / soft-sans body /
 * faceted-console surface / arcade-cards collection / command-rail action /
 * telemetry-columns chart / atrium-split template.
 *
 * Law A: chrome stays Crystalline Swan; this world paints ONLY the setting via --world-*.
 * Colour tokens route through palette custom properties (var(--token, #fallback)); the
 * bespoke setting depth in world-panel is the sanctioned carve-out (worlds/lawA.test.ts).
 */
import type { RecipeV2 } from '../../../../core/style-lens-os/v2/recipeV2';
import { RECIPE_SHARED } from '../recipeShared';

export const TERRAIN_CONSOLE_RECIPE: RecipeV2 = {
  ...RECIPE_SHARED,
  id: 'swan.terrain-console.v2',
  tokens: {
    'world-title-font': "700 clamp(26px, 3.1vw, 44px)/1.1 'Fira Code', monospace",
    'world-letter-spacing': '0.015em',
    'world-panel-radius': '4px',
    'world-row-radius': '3px',
    'world-dial-radius': '12px',
    'world-accent': 'var(--ice-wing, #60c0f0)',
    'world-action': 'var(--royal-depth, #003080)',
    'world-panel': 'color-mix(in srgb, #0d1e26 90%, transparent)',
    'world-row-columns': 'repeat(auto-fit, minmax(160px, 1fr))',
  },
  composition: {
    'desktop-enhanced': { template: 'atrium-split' },
    tablet: { template: 'atrium-split' },
    'mobile-minimal': { template: 'playfield-stack' },
  },
  components: {
    'text.display': { variant: 'compact-technical-mono' },
    'text.body': { variant: 'soft-sans' },
    'surface.card': { variant: 'faceted-console' },
    'collection.exercise': { variant: 'arcade-cards' },
    'action.primary': { variant: 'command-rail' },
    'chart.progress': { variant: 'telemetry-columns', familiarity: 'expressive' },
  },
};
