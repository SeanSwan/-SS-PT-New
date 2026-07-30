/**
 * WORLD RECIPE — coach-ledger (technical · evidence / data-story) · Swan World Engine
 * ==================================================================================
 * DNA: a provenance vault; evidence lit by confidence. Impossible optical phenomenon:
 * ink that glows brighter the more it is VERIFIED. Signature motion: confidence-glow rise
 * on coach-confirm. Surface fit: evidence/ledger, analytics, history. Codeword:
 * compact-technical-mono display / terminal-mono body / faceted-console surface /
 * ledger-strips collection / monolith-bar action / ring-gauge chart / atrium-split
 * template (differs from prism-terminal on collection+action+template = 3 axes on a
 * chart-less rollout surface, 4 with the Lab host's chart slot).
 * Law A: chrome stays Crystalline Swan.
 
 *
 * NOT YET IMPLEMENTED: this world declares no atmosphere, and the representation
 * layer animates nothing (proven by lensRepresentation.coverage.test.tsx). The
 * phenomenon and signature motion above are the DESIGN BRIEF for a later slice,
 * not a description of what renders today.
*/
import type { RecipeV2 } from '../../../../core/style-lens-os/v2/recipeV2';
import { RECIPE_SHARED } from '../recipeShared';

export const COACH_LEDGER_RECIPE: RecipeV2 = {
  ...RECIPE_SHARED,
  id: 'swan.coach-ledger.v2',
  tokens: {
    'world-title-font': "600 clamp(24px, 3vw, 44px)/1.1 'Fira Code', monospace",
    'world-letter-spacing': '0.01em',
    'world-panel-radius': '6px',
    'world-row-radius': '4px',
    'world-dial-radius': '50%',
    'world-accent': 'var(--ice-wing, #60c0f0)',
    'world-action': 'var(--midnight-sapphire, #002060)',
    'world-panel': 'color-mix(in srgb, #0f1c33 90%, transparent)',
    'world-row-columns': 'minmax(160px, 2fr) repeat(3, minmax(64px, 1fr))',
  },
  composition: {
    'desktop-enhanced': { template: 'atrium-split' },
    tablet: { template: 'atrium-split' },
    'mobile-minimal': { template: 'playfield-stack' },
  },
  components: {
    'text.display': { variant: 'compact-technical-mono' },
    'text.body': { variant: 'terminal-mono' },
    'surface.card': { variant: 'faceted-console' },
    'collection.exercise': { variant: 'ledger-strips' },
    'action.primary': { variant: 'monolith-bar' },
    'chart.progress': { variant: 'ring-gauge', familiarity: 'expressive' },
  },
};