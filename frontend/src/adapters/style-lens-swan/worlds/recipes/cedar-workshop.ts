/**
 * WORLD RECIPE — cedar-workshop (atmospheric) · Swan World Engine
 * =====================================================
 * DNA: a warm timber workshop at the end of the day; one beam through sawdust air.
 * Impossible optical phenomenon: dust motes that ORBIT the beam like planets.
 * Signature motion: motes circling the beam, undisturbed by anything the user does.
 * Surface fit: end-of-day review, journaling, coach notes.
 *
 * Structural codeword (>= 3 axes from EVERY other world, measured on a rollout surface with
 * no chart slot — the strictest host): compact-technical-mono display / signal-grotesk body
 * / lightwell surface / orbit-nodes collection / command-rail action / spark-ribbon chart /
 * editorial-column template.
 *
 * Law A: chrome stays Crystalline Swan; this world paints ONLY the setting via --world-*.
 * Colour tokens route through palette custom properties (var(--token, #fallback)); the
 * bespoke setting depth in world-panel is the sanctioned carve-out (worlds/lawA.test.ts).
 */
import type { RecipeV2 } from '../../../../core/style-lens-os/v2/recipeV2';
import { RECIPE_SHARED } from '../recipeShared';

export const CEDAR_WORKSHOP_RECIPE: RecipeV2 = {
  ...RECIPE_SHARED,
  id: 'swan.cedar-workshop.v2',
  tokens: {
    'world-title-font': "600 clamp(26px, 3.2vw, 46px)/1.14 'Fira Code', monospace",
    'world-letter-spacing': '0.02em',
    'world-panel-radius': '12px',
    'world-row-radius': '999px',
    'world-dial-radius': '50%',
    'world-accent': 'var(--gilded-fern, #c6a84b)',
    'world-action': 'var(--midnight-sapphire, #002060)',
    'world-panel': 'color-mix(in srgb, #1a1710 84%, transparent)',
    'world-row-columns': 'repeat(auto-fit, minmax(150px, 1fr))',
  },
  composition: {
    'desktop-enhanced': { template: 'editorial-column' },
    tablet: { template: 'editorial-column' },
    'mobile-minimal': { template: 'editorial-column' },
  },
  components: {
    'text.display': { variant: 'compact-technical-mono' },
    'text.body': { variant: 'signal-grotesk' },
    'surface.card': { variant: 'lightwell' },
    'collection.exercise': { variant: 'orbit-nodes' },
    'action.primary': { variant: 'command-rail' },
    'chart.progress': { variant: 'spark-ribbon', familiarity: 'expressive' },
  },
};
