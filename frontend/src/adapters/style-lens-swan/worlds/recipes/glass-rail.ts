/**
 * WORLD RECIPE — glass-rail (luxe) · Swan World Engine
 * ================================================================
 * DNA: a night train of glass along a coast; the interior is calm, the world streams past.
 * Impossible optical phenomenon: reflections that show the room one second in the FUTURE.
 * Signature motion: a horizontal light-streak passing behind the glass, never in front.
 * Surface fit: onboarding journeys, guided sequences, premium walkthroughs.
 *
 * NOT YET IMPLEMENTED: this world declares no atmosphere, and the representation
 * layer animates nothing (proven by lensRepresentation.coverage.test.tsx). The
 * phenomenon and signature motion above are the DESIGN BRIEF for a later slice,
 * not a description of what renders today.
 *
 * Structural codeword (>= 3 axes from EVERY other world, measured on a rollout surface with
 * no chart slot — the strictest host): vaulted-editorial display / humanist-serif body /
 * frosted-vault surface / orbit-nodes collection / pill-cluster action / ring-gauge chart /
 * atrium-split template.
 *
 * Law A: chrome stays Crystalline Swan; this world paints ONLY the setting via --world-*.
 * Colour tokens route through palette custom properties (var(--token, #fallback)); the
 * bespoke setting depth in world-panel is the sanctioned carve-out (worlds/lawA.test.ts).
 */
import type { RecipeV2 } from '../../../../core/style-lens-os/v2/recipeV2';
import { RECIPE_SHARED } from '../recipeShared';

export const GLASS_RAIL_RECIPE: RecipeV2 = {
  ...RECIPE_SHARED,
  id: 'swan.glass-rail.v2',
  tokens: {
    'world-title-font': "400 clamp(30px, 3.9vw, 58px)/1.1 'Cormorant Garamond', 'Plus Jakarta Sans', serif",
    'world-letter-spacing': '-0.005em',
    'world-panel-radius': '18px',
    'world-row-radius': '999px',
    'world-dial-radius': '50%',
    'world-accent': 'var(--ice-wing, #60c0f0)',
    'world-action': 'var(--royal-depth, #003080)',
    'world-panel': 'color-mix(in srgb, #0f1b33 78%, transparent)',
    'world-row-columns': 'repeat(auto-fit, minmax(150px, 1fr))',
  },
  composition: {
    'desktop-enhanced': { template: 'atrium-split' },
    tablet: { template: 'atrium-split' },
    'mobile-minimal': { template: 'playfield-stack' },
  },
  components: {
    'text.display': { variant: 'vaulted-editorial' },
    'text.body': { variant: 'humanist-serif' },
    'surface.card': { variant: 'frosted-vault' },
    'collection.exercise': { variant: 'orbit-nodes' },
    'action.primary': { variant: 'pill-cluster' },
    'chart.progress': { variant: 'ring-gauge', familiarity: 'expressive' },
  },
};
