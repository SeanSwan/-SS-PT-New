/**
 * WORLD RECIPE — signal-garden (playful) · Swan World Engine
 * ==========================================================
 * DNA: a greenhouse of instruments; every reading grows on a stem of light.
 * Impossible optical phenomenon: flora lit COOLER than the dark around it.
 * Signature motion: a slow phototropic lean of the readouts toward the active row.
 * Surface fit: progress gardens, streak surfaces, habit views.
 *
 * Structural codeword (>= 3 axes from EVERY other world, measured on a rollout surface with
 * no chart slot — the strictest host): rounded-athletic display / soft-sans body /
 * faceted-console surface / command-rows collection / pill-cluster action / arcade-meter
 * chart / playfield-stack template.
 *
 * Law A: chrome stays Crystalline Swan; this world paints ONLY the setting via --world-*.
 * Colour tokens route through palette custom properties (var(--token, #fallback)); the
 * bespoke setting depth in world-panel is the sanctioned carve-out (worlds/lawA.test.ts).
 */
import type { RecipeV2 } from '../../../../core/style-lens-os/v2/recipeV2';
import { RECIPE_SHARED } from '../recipeShared';

export const SIGNAL_GARDEN_RECIPE: RecipeV2 = {
  ...RECIPE_SHARED,
  id: 'swan.signal-garden.v2',
  tokens: {
    'world-title-font': "700 clamp(30px, 3.8vw, 56px)/1.06 Sora, 'Plus Jakarta Sans', sans-serif",
    'world-letter-spacing': '-0.015em',
    'world-panel-radius': '18px',
    'world-row-radius': '10px',
    'world-dial-radius': '50%',
    'world-accent': 'var(--ice-wing, #60c0f0)',
    'world-action': 'var(--wing-purple, #8b5cf6)',
    'world-panel': 'color-mix(in srgb, #0c2436 86%, transparent)',
    'world-row-columns': 'minmax(180px, 2fr) repeat(4, minmax(70px, 1fr))',
  },
  composition: {
    'desktop-enhanced': { template: 'playfield-stack' },
    tablet: { template: 'playfield-stack' },
    'mobile-minimal': { template: 'playfield-stack' },
  },
  components: {
    'text.display': { variant: 'rounded-athletic' },
    'text.body': { variant: 'soft-sans' },
    'surface.card': { variant: 'faceted-console' },
    'collection.exercise': { variant: 'command-rows' },
    'action.primary': { variant: 'pill-cluster' },
    'chart.progress': { variant: 'arcade-meter', familiarity: 'expressive' },
  },
};
