/**
 * WORLD RECIPE — kinetic-kanban (playful) · Swan World Engine
 * =========================================================
 * DNA: a training board where the work moves itself; columns breathe as cards settle.
 * Impossible optical phenomenon: tiles cast shadows in the direction they will move NEXT.
 * Signature motion: a column-settle bounce that lands a beat before the card does.
 * Surface fit: plan boards, session queues, admin triage.
 *
 * Structural codeword (>= 3 axes from EVERY other world, measured on a rollout surface with
 * no chart slot — the strictest host): rounded-athletic display / soft-sans body /
 * floating-candy surface / orbit-nodes collection / pill-cluster action / arcade-meter
 * chart / operator-grid template.
 *
 * Law A: chrome stays Crystalline Swan; this world paints ONLY the setting via --world-*.
 * Colour tokens route through palette custom properties (var(--token, #fallback)); the
 * bespoke setting depth in world-panel is the sanctioned carve-out (worlds/lawA.test.ts).
 */
import type { RecipeV2 } from '../../../../core/style-lens-os/v2/recipeV2';
import { RECIPE_SHARED } from '../recipeShared';

export const KINETIC_KANBAN_RECIPE: RecipeV2 = {
  ...RECIPE_SHARED,
  id: 'swan.kinetic-kanban.v2',
  tokens: {
    'world-title-font': "800 clamp(32px, 4.2vw, 62px)/1.02 Sora, 'Plus Jakarta Sans', sans-serif",
    'world-letter-spacing': '-0.02em',
    'world-panel-radius': '20px',
    'world-row-radius': '999px',
    'world-dial-radius': '50%',
    'world-accent': 'var(--wing-purple, #8b5cf6)',
    'world-action': 'var(--wing-purple, #8b5cf6)',
    'world-panel': 'color-mix(in srgb, #16264f 84%, transparent)',
    'world-row-columns': 'repeat(auto-fit, minmax(150px, 1fr))',
  },
  composition: {
    'desktop-enhanced': { template: 'operator-grid' },
    tablet: { template: 'operator-grid' },
    'mobile-minimal': { template: 'playfield-stack' },
  },
  components: {
    'text.display': { variant: 'rounded-athletic' },
    'text.body': { variant: 'soft-sans' },
    'surface.card': { variant: 'floating-candy' },
    'collection.exercise': { variant: 'orbit-nodes' },
    'action.primary': { variant: 'pill-cluster' },
    'chart.progress': { variant: 'arcade-meter', familiarity: 'expressive' },
  },
};
