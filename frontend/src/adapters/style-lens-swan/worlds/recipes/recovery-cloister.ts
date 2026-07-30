/**
 * WORLD RECIPE — recovery-cloister (calm) · Swan World Engine
 * =========================================================
 * DNA: a covered walk around still water; the day is allowed to be quiet.
 * Impossible optical phenomenon: caustic nets projected onto AIR.
 * Signature motion: a caustic drift that never repeats and never hurries.
 * Surface fit: deload weeks, recovery days, sleep and readiness.
 *
 * NOT YET IMPLEMENTED: this world declares no atmosphere, and the representation
 * layer animates nothing (proven by lensRepresentation.coverage.test.tsx). The
 * phenomenon and signature motion above are the DESIGN BRIEF for a later slice,
 * not a description of what renders today.
 *
 * Structural codeword (>= 3 axes from EVERY other world, measured on a rollout surface with
 * no chart slot — the strictest host): monastic-quiet display / soft-sans body /
 * etched-stone surface / arcade-cards collection / command-rail action / ring-gauge chart /
 * playfield-stack template.
 *
 * Law A: chrome stays Crystalline Swan; this world paints ONLY the setting via --world-*.
 * Colour tokens route through palette custom properties (var(--token, #fallback)); the
 * bespoke setting depth in world-panel is the sanctioned carve-out (worlds/lawA.test.ts).
 */
import type { RecipeV2 } from '../../../../core/style-lens-os/v2/recipeV2';
import { RECIPE_SHARED } from '../recipeShared';

export const RECOVERY_CLOISTER_RECIPE: RecipeV2 = {
  ...RECIPE_SHARED,
  id: 'swan.recovery-cloister.v2',
  tokens: {
    'world-title-font': "500 clamp(28px, 3.4vw, 50px)/1.22 'Plus Jakarta Sans', sans-serif",
    'world-letter-spacing': '0.005em',
    'world-panel-radius': '14px',
    'world-row-radius': '12px',
    'world-dial-radius': '50%',
    'world-accent': 'var(--swan-lavender, #4070c0)',
    'world-action': 'var(--midnight-sapphire, #002060)',
    'world-panel': 'color-mix(in srgb, #101b2e 92%, transparent)',
    'world-row-columns': 'repeat(auto-fit, minmax(160px, 1fr))',
  },
  composition: {
    'desktop-enhanced': { template: 'playfield-stack' },
    tablet: { template: 'playfield-stack' },
    'mobile-minimal': { template: 'playfield-stack' },
  },
  components: {
    'text.display': { variant: 'monastic-quiet' },
    'text.body': { variant: 'soft-sans' },
    'surface.card': { variant: 'etched-stone' },
    'collection.exercise': { variant: 'arcade-cards' },
    'action.primary': { variant: 'command-rail' },
    'chart.progress': { variant: 'ring-gauge', familiarity: 'expressive' },
  },
};
