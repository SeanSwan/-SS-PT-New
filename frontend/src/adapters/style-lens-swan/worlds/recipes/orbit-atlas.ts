/**
 * WORLD RECIPE — orbit-atlas (playful) · Swan World Engine
 * ============================================================
 * DNA: the training year drawn as orbits; each block a body on its own period.
 * Impossible optical phenomenon: lensed starlight blooming INTO orbit rings rather than out
 * of them.
 * Signature motion: rings advance one degree per session logged.
 * Surface fit: periodization overview, long-arc progress, milestone maps.
 *
 * NOT YET IMPLEMENTED: this world declares no atmosphere, and the representation
 * layer animates nothing (proven by lensRepresentation.coverage.test.tsx). The
 * phenomenon and signature motion above are the DESIGN BRIEF for a later slice,
 * not a description of what renders today.
 *
 * Structural codeword (>= 3 axes from EVERY other world, measured on a rollout surface with
 * no chart slot — the strictest host): rounded-athletic display / soft-sans body /
 * faceted-console surface / orbit-nodes collection / glass-dock action / arcade-meter chart
 * / editorial-column template.
 *
 * Law A: chrome stays Crystalline Swan; this world paints ONLY the setting via --world-*.
 * Colour tokens route through palette custom properties (var(--token, #fallback)); the
 * bespoke setting depth in world-panel is the sanctioned carve-out (worlds/lawA.test.ts).
 */
import type { RecipeV2 } from '../../../../core/style-lens-os/v2/recipeV2';
import { RECIPE_SHARED } from '../recipeShared';

export const ORBIT_ATLAS_RECIPE: RecipeV2 = {
  ...RECIPE_SHARED,
  id: 'swan.orbit-atlas.v2',
  tokens: {
    'world-title-font': "700 clamp(30px, 4vw, 58px)/1.08 Sora, 'Plus Jakarta Sans', sans-serif",
    'world-letter-spacing': '-0.01em',
    'world-panel-radius': '22px',
    'world-row-radius': '999px',
    'world-dial-radius': '50%',
    'world-accent': 'var(--swan-lavender, #4070c0)',
    'world-action': 'var(--wing-purple, #8b5cf6)',
    'world-panel': 'color-mix(in srgb, #101c44 80%, transparent)',
    'world-row-columns': 'repeat(auto-fit, minmax(150px, 1fr))',
  },
  composition: {
    'desktop-enhanced': { template: 'editorial-column' },
    tablet: { template: 'editorial-column' },
    'mobile-minimal': { template: 'editorial-column' },
  },
  components: {
    'text.display': { variant: 'rounded-athletic' },
    'text.body': { variant: 'soft-sans' },
    'surface.card': { variant: 'faceted-console' },
    'collection.exercise': { variant: 'orbit-nodes' },
    'action.primary': { variant: 'glass-dock' },
    'chart.progress': { variant: 'arcade-meter', familiarity: 'expressive' },
  },
};
