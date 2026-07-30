/**
 * WORLD RECIPE — quiet-meridian (calm · morning / daily home) · Swan World Engine
 * ==============================================================================
 * DNA: dawn's first minute on a frozen plain. Impossible optical phenomenon: a shadow
 * that retreats TOWARD the light. Signature motion: a terminator sweep, alpenglow holds.
 * Surface fit: morning open, daily home. Codeword: monastic-quiet display / soft-sans
 * body / etched-stone surface / ledger-strips collection / pill-cluster action /
 * ring-gauge chart / atrium-split template (differs from coach-ledger on typography+
 * surface+action = 3 axes). Law A: chrome stays Crystalline Swan; Swan Lavender is the
 * calm signal in the SETTING only.
 *
 * NOT YET IMPLEMENTED: this world declares no atmosphere, and the representation
 * layer animates nothing (proven by lensRepresentation.coverage.test.tsx). The
 * phenomenon and signature motion above are the DESIGN BRIEF for a later slice,
 * not a description of what renders today.
 */
import type { RecipeV2 } from '../../../../core/style-lens-os/v2/recipeV2';
import { RECIPE_SHARED } from '../recipeShared';

export const QUIET_MERIDIAN_RECIPE: RecipeV2 = {
  ...RECIPE_SHARED,
  id: 'swan.quiet-meridian.v2',
  tokens: {
    'world-title-font': "500 clamp(28px, 3.4vw, 52px)/1.2 'Plus Jakarta Sans', sans-serif",
    'world-letter-spacing': '-0.005em',
    'world-panel-radius': '12px',
    'world-row-radius': '8px',
    'world-dial-radius': '50%',
    'world-accent': 'var(--swan-lavender, #4070c0)',
    'world-action': 'var(--midnight-sapphire, #002060)',
    'world-panel': 'color-mix(in srgb, #121c30 92%, transparent)',
    'world-row-columns': 'minmax(160px, 2fr) repeat(3, minmax(64px, 1fr))',
  },
  composition: {
    'desktop-enhanced': { template: 'atrium-split' },
    tablet: { template: 'atrium-split' },
    'mobile-minimal': { template: 'playfield-stack' },
  },
  components: {
    'text.display': { variant: 'monastic-quiet' },
    'text.body': { variant: 'soft-sans' },
    'surface.card': { variant: 'etched-stone' },
    'collection.exercise': { variant: 'ledger-strips' },
    'action.primary': { variant: 'pill-cluster' },
    'chart.progress': { variant: 'ring-gauge', familiarity: 'expressive' },
  },
};
