/**
 * WORLD RECIPE — analog-flight-recorder (technical) · Swan World Engine
 * ===============================================
 * DNA: an instrument panel that survived the flight; every trace is evidence.
 * Impossible optical phenomenon: needles that read the value one tick in the FUTURE.
 * Signature motion: a needle settle with real inertia, then a recorded tick mark.
 * Surface fit: session telemetry, load/volume audit, incident review.
 *
 * NOT YET IMPLEMENTED: this world declares no atmosphere, and the representation
 * layer animates nothing (proven by lensRepresentation.coverage.test.tsx). The
 * phenomenon and signature motion above are the DESIGN BRIEF for a later slice,
 * not a description of what renders today.
 *
 * Structural codeword (>= 3 axes from EVERY other world, measured on a rollout surface with
 * no chart slot — the strictest host): rounded-athletic display / terminal-mono body /
 * faceted-console surface / command-rows collection / glass-dock action / telemetry-columns
 * chart / atrium-split template.
 *
 * Law A: chrome stays Crystalline Swan; this world paints ONLY the setting via --world-*.
 * Colour tokens route through palette custom properties (var(--token, #fallback)); the
 * bespoke setting depth in world-panel is the sanctioned carve-out (worlds/lawA.test.ts).
 */
import type { RecipeV2 } from '../../../../core/style-lens-os/v2/recipeV2';
import { RECIPE_SHARED } from '../recipeShared';

export const ANALOG_FLIGHT_RECORDER_RECIPE: RecipeV2 = {
  ...RECIPE_SHARED,
  id: 'swan.analog-flight-recorder.v2',
  tokens: {
    'world-title-font': "700 clamp(24px, 3vw, 42px)/1.12 'Fira Code', monospace",
    'world-letter-spacing': '0.02em',
    'world-panel-radius': '3px',
    'world-row-radius': '2px',
    'world-dial-radius': '50%',
    'world-accent': 'var(--gilded-fern, #c6a84b)',
    'world-action': 'var(--midnight-sapphire, #002060)',
    'world-panel': 'color-mix(in srgb, #14161c 92%, transparent)',
    'world-row-columns': 'minmax(180px, 2fr) repeat(4, minmax(70px, 1fr))',
  },
  composition: {
    'desktop-enhanced': { template: 'atrium-split' },
    tablet: { template: 'atrium-split' },
    'mobile-minimal': { template: 'playfield-stack' },
  },
  components: {
    'text.display': { variant: 'rounded-athletic' },
    'text.body': { variant: 'terminal-mono' },
    'surface.card': { variant: 'faceted-console' },
    'collection.exercise': { variant: 'command-rows' },
    'action.primary': { variant: 'glass-dock' },
    'chart.progress': { variant: 'telemetry-columns', familiarity: 'expressive' },
  },
};
