/**
 * WORLD RECIPE — split-horizon (atmospheric) · Swan World Engine
 * ======================================================
 * DNA: the moment the ridge divides two skies; below is settled, above is arriving.
 * Impossible optical phenomenon: a garden of lensed starlight blooming AT the ridge.
 * Signature motion: the horizon line drifting a few pixels as the session progresses.
 * Surface fit: before/after, transition moments, goal horizons.
 *
 * NOT YET IMPLEMENTED: this world declares no atmosphere, and the representation
 * layer animates nothing (proven by lensRepresentation.coverage.test.tsx). The
 * phenomenon and signature motion above are the DESIGN BRIEF for a later slice,
 * not a description of what renders today.
 *
 * Structural codeword (>= 3 axes from EVERY other world, measured on a rollout surface with
 * no chart slot — the strictest host): rounded-athletic display / signal-grotesk body /
 * lightwell surface / arcade-cards collection / monolith-bar action / spark-ribbon chart /
 * editorial-column template.
 *
 * Law A: chrome stays Crystalline Swan; this world paints ONLY the setting via --world-*.
 * Colour tokens route through palette custom properties (var(--token, #fallback)); the
 * bespoke setting depth in world-panel is the sanctioned carve-out (worlds/lawA.test.ts).
 */
import type { RecipeV2 } from '../../../../core/style-lens-os/v2/recipeV2';
import { RECIPE_SHARED } from '../recipeShared';

export const SPLIT_HORIZON_RECIPE: RecipeV2 = {
  ...RECIPE_SHARED,
  id: 'swan.split-horizon.v2',
  tokens: {
    'world-title-font': "600 clamp(30px, 4vw, 58px)/1.1 Sora, 'Plus Jakarta Sans', sans-serif",
    'world-letter-spacing': '-0.01em',
    'world-panel-radius': '20px',
    'world-row-radius': '18px',
    'world-dial-radius': '50%',
    'world-accent': 'var(--swan-lavender, #4070c0)',
    'world-action': 'var(--midnight-sapphire, #002060)',
    'world-panel': 'color-mix(in srgb, #101636 78%, transparent)',
    'world-row-columns': 'repeat(auto-fit, minmax(160px, 1fr))',
  },
  composition: {
    'desktop-enhanced': { template: 'editorial-column' },
    tablet: { template: 'editorial-column' },
    'mobile-minimal': { template: 'editorial-column' },
  },
  components: {
    'text.display': { variant: 'rounded-athletic' },
    'text.body': { variant: 'signal-grotesk' },
    'surface.card': { variant: 'lightwell' },
    'collection.exercise': { variant: 'arcade-cards' },
    'action.primary': { variant: 'monolith-bar' },
    'chart.progress': { variant: 'spark-ribbon', familiarity: 'expressive' },
  },
};
