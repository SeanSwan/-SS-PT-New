/**
 * WORLD RECIPE — meridian-magazine (luxe) · Swan World Engine
 * =========================================================
 * DNA: the athlete as cover story; the week set as an editorial spread.
 * Impossible optical phenomenon: lens flares that cast SHADOWS.
 * Signature motion: a page-gutter parallax of one column against the other.
 * Surface fit: weekly reviews, shareable recaps, client-facing reporting.
 *
 * Structural codeword (>= 3 axes from EVERY other world, measured on a rollout surface with
 * no chart slot — the strictest host): vaulted-editorial display / humanist-serif body /
 * frosted-vault surface / arcade-cards collection / command-rail action / ring-gauge chart
 * / operator-grid template.
 *
 * Law A: chrome stays Crystalline Swan; this world paints ONLY the setting via --world-*.
 * Colour tokens route through palette custom properties (var(--token, #fallback)); the
 * bespoke setting depth in world-panel is the sanctioned carve-out (worlds/lawA.test.ts).
 */
import type { RecipeV2 } from '../../../../core/style-lens-os/v2/recipeV2';
import { RECIPE_SHARED } from '../recipeShared';

export const MERIDIAN_MAGAZINE_RECIPE: RecipeV2 = {
  ...RECIPE_SHARED,
  id: 'swan.meridian-magazine.v2',
  tokens: {
    'world-title-font': "600 clamp(32px, 4.2vw, 64px)/1.04 'Cormorant Garamond', 'Plus Jakarta Sans', serif",
    'world-letter-spacing': '-0.012em',
    'world-panel-radius': '6px',
    'world-row-radius': '4px',
    'world-dial-radius': '4px',
    'world-accent': 'var(--gilded-fern, #c6a84b)',
    'world-action': 'var(--midnight-sapphire, #002060)',
    'world-panel': 'color-mix(in srgb, #171520 84%, transparent)',
    'world-row-columns': 'repeat(auto-fit, minmax(160px, 1fr))',
  },
  composition: {
    'desktop-enhanced': { template: 'operator-grid' },
    tablet: { template: 'operator-grid' },
    'mobile-minimal': { template: 'playfield-stack' },
  },
  components: {
    'text.display': { variant: 'vaulted-editorial' },
    'text.body': { variant: 'humanist-serif' },
    'surface.card': { variant: 'frosted-vault' },
    'collection.exercise': { variant: 'arcade-cards' },
    'action.primary': { variant: 'command-rail' },
    'chart.progress': { variant: 'ring-gauge', familiarity: 'expressive' },
  },
};
