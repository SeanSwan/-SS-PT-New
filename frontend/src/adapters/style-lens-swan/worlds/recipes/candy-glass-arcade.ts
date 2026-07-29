/**
 * WORLD RECIPE — candy-glass-arcade (playful) · Swan World Engine
 * ==============================================================
 * DNA: a 2am boardwalk arcade cast entirely in pulled sugar-glass. Impossible
 * optical phenomenon: neon that refracts THROUGH solid glass and arrives before
 * it is emitted. Signature motion: marquee chase-light ripples through glass and
 * shatters into sprinkles of bokeh. Surface fit: storefront, gamified dashboard,
 * onboarding. (Master build prompt §1.)
 *
 * Moved verbatim from `v2/labRecipes.ts` in Slice 1 (values byte-identical →
 * compiled plan unchanged). Law A: chrome stays Crystalline Swan tokens; the
 * world paints only the setting via `--world-*` (LensPlanFrame maps `lens2-*`).
 */
import type { RecipeV2 } from '../../../../core/style-lens-os/v2/recipeV2';
import { RECIPE_SHARED } from '../recipeShared';

/** Playful glass depth, bold action dock, elastic reward energy. */
export const CANDY_GLASS_ARCADE_RECIPE: RecipeV2 = {
  ...RECIPE_SHARED,
  id: 'swan.candy-glass-arcade.v2',
  tokens: {
    'world-title-font': "800 clamp(38px, 5vw, 76px)/1 Sora, sans-serif",
    'world-letter-spacing': '-0.02em',
    'world-panel-radius': '26px',
    'world-row-radius': '22px',
    'world-dial-radius': '50%',
    'world-accent': 'var(--wing-purple, #8b5cf6)',
    'world-action': 'var(--wing-purple, #8b5cf6)',
    'world-panel': 'color-mix(in srgb, #14245a 82%, transparent)',
    'world-row-columns': 'repeat(auto-fit, minmax(150px, 1fr))',
  },
  composition: {
    'desktop-enhanced': { template: 'playfield-stack' },
    'tablet': { template: 'playfield-stack' },
    'mobile-minimal': { template: 'playfield-stack' },
  },
  components: {
    'text.display': { variant: 'rounded-athletic' },
    'text.body': { variant: 'soft-sans' },
    'surface.card': { variant: 'floating-candy' },
    'collection.exercise': { variant: 'arcade-cards' },
    'action.primary': { variant: 'glass-dock' },
    'chart.progress': { variant: 'arcade-meter', familiarity: 'expressive' },
  },
};
