/**
 * WORLD RECIPE — tidal-columns (atmospheric) · Swan World Engine
 * ======================================================
 * DNA: rain columns walking across a flooded plain; the whole sky is in every drop.
 * Impossible optical phenomenon: each raindrop projects a tiny INVERTED image of the sky.
 * Signature motion: columns crossing the frame at different depths and speeds.
 * Surface fit: ambient dashboards, mood-led home surfaces, seasonal moments.
 *
 * Structural codeword (>= 3 axes from EVERY other world, measured on a rollout surface with
 * no chart slot — the strictest host): aurora-airy display / signal-grotesk body /
 * lightwell surface / orbit-nodes collection / monolith-bar action / spark-ribbon chart /
 * playfield-stack template.
 *
 * Law A: chrome stays Crystalline Swan; this world paints ONLY the setting via --world-*.
 * Colour tokens route through palette custom properties (var(--token, #fallback)); the
 * bespoke setting depth in world-panel is the sanctioned carve-out (worlds/lawA.test.ts).
 */
import type { RecipeV2 } from '../../../../core/style-lens-os/v2/recipeV2';
import { RECIPE_SHARED } from '../recipeShared';

export const TIDAL_COLUMNS_RECIPE: RecipeV2 = {
  ...RECIPE_SHARED,
  id: 'swan.tidal-columns.v2',
  tokens: {
    'world-title-font': "400 clamp(30px, 4vw, 60px)/1.16 'Plus Jakarta Sans', sans-serif",
    'world-letter-spacing': '0.05em',
    'world-panel-radius': '24px',
    'world-row-radius': '999px',
    'world-dial-radius': '50%',
    'world-accent': 'var(--ice-wing, #60c0f0)',
    'world-action': 'var(--midnight-sapphire, #002060)',
    'world-panel': 'color-mix(in srgb, #0a1e2e 80%, transparent)',
    'world-row-columns': 'repeat(auto-fit, minmax(150px, 1fr))',
  },
  composition: {
    'desktop-enhanced': { template: 'playfield-stack' },
    tablet: { template: 'playfield-stack' },
    'mobile-minimal': { template: 'playfield-stack' },
  },
  components: {
    'text.display': { variant: 'aurora-airy' },
    'text.body': { variant: 'signal-grotesk' },
    'surface.card': { variant: 'lightwell' },
    'collection.exercise': { variant: 'orbit-nodes' },
    'action.primary': { variant: 'monolith-bar' },
    'chart.progress': { variant: 'spark-ribbon', familiarity: 'expressive' },
  },
};
