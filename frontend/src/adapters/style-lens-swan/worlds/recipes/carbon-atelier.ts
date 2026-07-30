/**
 * WORLD RECIPE — carbon-atelier (luxe) · Swan World Engine
 * ============================================================
 * DNA: a bespoke workshop in woven carbon; the craft is visible in the weave.
 * Impossible optical phenomenon: threads of light casting COLORED shadows.
 * Signature motion: a single raking light travelling the weave once per view.
 * Surface fit: premium tiers, bespoke programming, concierge surfaces.
 *
 * NOT YET IMPLEMENTED: this world declares no atmosphere, and the representation
 * layer animates nothing (proven by lensRepresentation.coverage.test.tsx). The
 * phenomenon and signature motion above are the DESIGN BRIEF for a later slice,
 * not a description of what renders today.
 *
 * Structural codeword (>= 3 axes from EVERY other world, measured on a rollout surface with
 * no chart slot — the strictest host): vaulted-editorial display / humanist-serif body /
 * frosted-vault surface / command-rows collection / glass-dock action / ring-gauge chart /
 * playfield-stack template.
 *
 * Law A: chrome stays Crystalline Swan; this world paints ONLY the setting via --world-*.
 * Colour tokens route through palette custom properties (var(--token, #fallback)); the
 * bespoke setting depth in world-panel is the sanctioned carve-out (worlds/lawA.test.ts).
 */
import type { RecipeV2 } from '../../../../core/style-lens-os/v2/recipeV2';
import { RECIPE_SHARED } from '../recipeShared';

export const CARBON_ATELIER_RECIPE: RecipeV2 = {
  ...RECIPE_SHARED,
  id: 'swan.carbon-atelier.v2',
  tokens: {
    'world-title-font': "600 clamp(30px, 3.9vw, 58px)/1.1 'Cormorant Garamond', 'Plus Jakarta Sans', serif",
    'world-letter-spacing': '-0.008em',
    'world-panel-radius': '8px',
    'world-row-radius': '6px',
    'world-dial-radius': '8px',
    'world-accent': 'var(--gilded-fern, #c6a84b)',
    'world-action': 'var(--midnight-sapphire, #002060)',
    'world-panel': 'color-mix(in srgb, #14141a 90%, transparent)',
    'world-row-columns': 'minmax(180px, 2fr) repeat(4, minmax(70px, 1fr))',
  },
  composition: {
    'desktop-enhanced': { template: 'playfield-stack' },
    tablet: { template: 'playfield-stack' },
    'mobile-minimal': { template: 'playfield-stack' },
  },
  components: {
    'text.display': { variant: 'vaulted-editorial' },
    'text.body': { variant: 'humanist-serif' },
    'surface.card': { variant: 'frosted-vault' },
    'collection.exercise': { variant: 'command-rows' },
    'action.primary': { variant: 'glass-dock' },
    'chart.progress': { variant: 'ring-gauge', familiarity: 'expressive' },
  },
};
