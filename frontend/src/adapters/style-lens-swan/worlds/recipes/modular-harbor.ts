/**
 * WORLD RECIPE — modular-harbor (playful) · Swan World Engine
 * =========================================================
 * DNA: a night harbor of stacked containers; every block snaps to the waterline.
 * Impossible optical phenomenon: reflections that lag their source by half a second.
 * Signature motion: a tide-line that settles under each card as it docks.
 * Surface fit: block builders, template libraries, drag-to-assemble surfaces.
 *
 * Structural codeword (>= 3 axes from EVERY other world, measured on a rollout surface with
 * no chart slot — the strictest host): rounded-athletic display / soft-sans body /
 * frosted-vault surface / arcade-cards collection / pill-cluster action / arcade-meter
 * chart / editorial-column template.
 *
 * Law A: chrome stays Crystalline Swan; this world paints ONLY the setting via --world-*.
 * Colour tokens route through palette custom properties (var(--token, #fallback)); the
 * bespoke setting depth in world-panel is the sanctioned carve-out (worlds/lawA.test.ts).
 */
import type { RecipeV2 } from '../../../../core/style-lens-os/v2/recipeV2';
import { RECIPE_SHARED } from '../recipeShared';

export const MODULAR_HARBOR_RECIPE: RecipeV2 = {
  ...RECIPE_SHARED,
  id: 'swan.modular-harbor.v2',
  tokens: {
    'world-title-font': "700 clamp(30px, 3.9vw, 56px)/1.05 Sora, 'Plus Jakarta Sans', sans-serif",
    'world-letter-spacing': '-0.018em',
    'world-panel-radius': '16px',
    'world-row-radius': '14px',
    'world-dial-radius': '50%',
    'world-accent': 'var(--ice-wing, #60c0f0)',
    'world-action': 'var(--midnight-sapphire, #002060)',
    'world-panel': 'color-mix(in srgb, #0b2138 84%, transparent)',
    'world-row-columns': 'repeat(auto-fit, minmax(160px, 1fr))',
  },
  composition: {
    'desktop-enhanced': { template: 'editorial-column' },
    tablet: { template: 'editorial-column' },
    'mobile-minimal': { template: 'editorial-column' },
  },
  components: {
    'text.display': { variant: 'rounded-athletic' },
    'text.body': { variant: 'soft-sans' },
    'surface.card': { variant: 'frosted-vault' },
    'collection.exercise': { variant: 'arcade-cards' },
    'action.primary': { variant: 'pill-cluster' },
    'chart.progress': { variant: 'arcade-meter', familiarity: 'expressive' },
  },
};
