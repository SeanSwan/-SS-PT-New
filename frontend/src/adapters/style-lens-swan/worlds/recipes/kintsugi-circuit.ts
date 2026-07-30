/**
 * WORLD RECIPE — kintsugi-circuit (playful) · Swan World Engine
 * =======================================================
 * DNA: a repaired board where every past break is traced in gold and carries current.
 * Impossible optical phenomenon: fractures that heal FORWARD — gold flows into cracks not
 * yet formed.
 * Signature motion: a gold seam completing itself along the active path.
 * Surface fit: return-to-training, injury recovery arcs, comeback milestones.
 *
 * NOT YET IMPLEMENTED: this world declares no atmosphere, and the representation
 * layer animates nothing (proven by lensRepresentation.coverage.test.tsx). The
 * phenomenon and signature motion above are the DESIGN BRIEF for a later slice,
 * not a description of what renders today.
 *
 * Structural codeword (>= 3 axes from EVERY other world, measured on a rollout surface with
 * no chart slot — the strictest host): rounded-athletic display / terminal-mono body /
 * floating-candy surface / gallery-tiles collection / pill-cluster action / arcade-meter
 * chart / playfield-stack template.
 *
 * Law A: chrome stays Crystalline Swan; this world paints ONLY the setting via --world-*.
 * Colour tokens route through palette custom properties (var(--token, #fallback)); the
 * bespoke setting depth in world-panel is the sanctioned carve-out (worlds/lawA.test.ts).
 */
import type { RecipeV2 } from '../../../../core/style-lens-os/v2/recipeV2';
import { RECIPE_SHARED } from '../recipeShared';

export const KINTSUGI_CIRCUIT_RECIPE: RecipeV2 = {
  ...RECIPE_SHARED,
  id: 'swan.kintsugi-circuit.v2',
  tokens: {
    'world-title-font': "700 clamp(30px, 4vw, 58px)/1.06 Sora, 'Plus Jakarta Sans', sans-serif",
    'world-letter-spacing': '-0.012em',
    'world-panel-radius': '18px',
    'world-row-radius': '16px',
    'world-dial-radius': '50%',
    'world-accent': 'var(--gilded-fern, #c6a84b)',
    'world-action': 'var(--wing-purple, #8b5cf6)',
    'world-panel': 'color-mix(in srgb, #171233 86%, transparent)',
    'world-row-columns': 'repeat(auto-fit, minmax(230px, 1fr))',
  },
  composition: {
    'desktop-enhanced': { template: 'playfield-stack' },
    tablet: { template: 'playfield-stack' },
    'mobile-minimal': { template: 'playfield-stack' },
  },
  components: {
    'text.display': { variant: 'rounded-athletic' },
    'text.body': { variant: 'terminal-mono' },
    'surface.card': { variant: 'floating-candy' },
    'collection.exercise': { variant: 'gallery-tiles' },
    'action.primary': { variant: 'pill-cluster' },
    'chart.progress': { variant: 'arcade-meter', familiarity: 'expressive' },
  },
};
