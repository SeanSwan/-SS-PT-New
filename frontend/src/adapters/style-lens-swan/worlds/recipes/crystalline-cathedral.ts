/**
 * WORLD RECIPE — crystalline-cathedral (luxe · marketing hero) · Swan World Engine
 * ===============================================================================
 * DNA: a gothic nave whose stained glass is grown crystal. Impossible optical
 * phenomenon: rose-window caustics projected onto AIR, not the floor. Signature motion:
 * rose-window rotation ~1°/min; incense-pulse traces the tracery. Surface fit: flagship
 * marketing hero, launch moments. Codeword: vaulted-editorial display / humanist-serif
 * body / frosted-vault surface / gallery-tiles collection / monolith-bar action /
 * ring-gauge chart / editorial-column template. Law A: chrome stays Crystalline Swan;
 * gold (Gilded Fern) is the luxe signal in the SETTING only.
 */
import type { RecipeV2 } from '../../../../core/style-lens-os/v2/recipeV2';
import { RECIPE_SHARED } from '../recipeShared';

export const CRYSTALLINE_CATHEDRAL_RECIPE: RecipeV2 = {
  ...RECIPE_SHARED,
  id: 'swan.crystalline-cathedral.v2',
  tokens: {
    'world-title-font': "600 clamp(34px, 4.4vw, 68px)/1.08 'Cormorant Garamond', 'Plus Jakarta Sans', serif",
    'world-letter-spacing': '-0.01em',
    'world-panel-radius': '14px',
    'world-row-radius': '10px',
    'world-dial-radius': '10px',
    'world-accent': 'var(--gilded-fern, #c6a84b)',
    'world-action': 'var(--midnight-sapphire, #002060)',
    'world-panel': 'color-mix(in srgb, #101a3a 70%, transparent)',
    'world-row-columns': 'repeat(auto-fit, minmax(240px, 1fr))',
  },
  composition: {
    'desktop-enhanced': { template: 'editorial-column' },
    tablet: { template: 'editorial-column' },
    'mobile-minimal': { template: 'editorial-column' },
  },
  components: {
    'text.display': { variant: 'vaulted-editorial' },
    'text.body': { variant: 'humanist-serif' },
    'surface.card': { variant: 'frosted-vault' },
    'collection.exercise': { variant: 'gallery-tiles' },
    'action.primary': { variant: 'monolith-bar' },
    'chart.progress': { variant: 'ring-gauge', familiarity: 'expressive' },
  },
};
