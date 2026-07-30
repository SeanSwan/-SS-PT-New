/**
 * WORLD RECIPE — tempo-forge (playful) · Swan World Engine
 * ============================================================
 * DNA: a cold forge where effort is struck into shape at the metronome.
 * Impossible optical phenomenon: cold sparks that freeze mid-air into glass filings.
 * Signature motion: a strike-pulse on the beat, filings drifting down after it.
 * Surface fit: interval work, conditioning, tempo-led sessions.
 *
 * NOT YET IMPLEMENTED: this world declares no atmosphere, and the representation
 * layer animates nothing (proven by lensRepresentation.coverage.test.tsx). The
 * phenomenon and signature motion above are the DESIGN BRIEF for a later slice,
 * not a description of what renders today.
 *
 * Structural codeword (>= 3 axes from EVERY other world, measured on a rollout surface with
 * no chart slot — the strictest host): rounded-athletic display / soft-sans body /
 * frosted-vault surface / orbit-nodes collection / command-rail action / arcade-meter chart
 * / playfield-stack template.
 *
 * Law A: chrome stays Crystalline Swan; this world paints ONLY the setting via --world-*.
 * Colour tokens route through palette custom properties (var(--token, #fallback)); the
 * bespoke setting depth in world-panel is the sanctioned carve-out (worlds/lawA.test.ts).
 */
import type { RecipeV2 } from '../../../../core/style-lens-os/v2/recipeV2';
import { RECIPE_SHARED } from '../recipeShared';

export const TEMPO_FORGE_RECIPE: RecipeV2 = {
  ...RECIPE_SHARED,
  id: 'swan.tempo-forge.v2',
  tokens: {
    'world-title-font': "800 clamp(30px, 4vw, 58px)/1 Sora, 'Plus Jakarta Sans', sans-serif",
    'world-letter-spacing': '-0.025em',
    'world-panel-radius': '10px',
    'world-row-radius': '999px',
    'world-dial-radius': '50%',
    'world-accent': 'var(--gilded-fern, #c6a84b)',
    'world-action': 'var(--midnight-sapphire, #002060)',
    'world-panel': 'color-mix(in srgb, #1e1a2e 88%, transparent)',
    'world-row-columns': 'repeat(auto-fit, minmax(150px, 1fr))',
  },
  composition: {
    'desktop-enhanced': { template: 'playfield-stack' },
    tablet: { template: 'playfield-stack' },
    'mobile-minimal': { template: 'playfield-stack' },
  },
  components: {
    'text.display': { variant: 'rounded-athletic' },
    'text.body': { variant: 'soft-sans' },
    'surface.card': { variant: 'frosted-vault' },
    'collection.exercise': { variant: 'orbit-nodes' },
    'action.primary': { variant: 'command-rail' },
    'chart.progress': { variant: 'arcade-meter', familiarity: 'expressive' },
  },
};
