/**
 * WORLD RECIPE — prism-terminal (technical) · Swan World Engine
 * ============================================================
 * DNA: a deep-space relay station where data arrives as dispersed spectra.
 * Impossible optical phenomenon: white light that splits into a rainbow BEFORE
 * it hits the prism. Signature motion: a single beam enters frame, fans into 7
 * bands, each band becomes a data stream. Surface fit: Coach console, analytics.
 * (Master build prompt §1.)
 *
 * Moved verbatim from `v2/labRecipes.ts` in Slice 1 (values byte-identical →
 * compiled plan unchanged). Law A: chrome stays Crystalline Swan tokens.
 */
import type { RecipeV2 } from '../../../../core/style-lens-os/v2/recipeV2';
import { RECIPE_SHARED } from '../recipeShared';

/** Compact diagnostic console: mono type, faceted panels, command rail. */
export const PRISM_TERMINAL_RECIPE: RecipeV2 = {
  ...RECIPE_SHARED,
  id: 'swan.prism-terminal.v2',
  tokens: {
    'world-title-font': "700 clamp(26px, 3.2vw, 48px)/1.08 'Fira Code', monospace",
    'world-letter-spacing': '0.01em',
    'world-panel-radius': '4px',
    'world-row-radius': '3px',
    'world-dial-radius': '6px',
    'world-accent': 'var(--ice-wing, #60c0f0)',
    'world-action': 'var(--midnight-sapphire, #002060)',
    'world-panel': 'color-mix(in srgb, #10203a 92%, transparent)',
    'world-row-columns': 'minmax(180px, 2fr) repeat(4, minmax(70px, 1fr))',
  },
  composition: {
    'desktop-enhanced': { template: 'operator-grid' },
    'tablet': { template: 'operator-grid' },
    'mobile-minimal': { template: 'playfield-stack' },
  },
  components: {
    'text.display': { variant: 'compact-technical-mono' },
    'text.body': { variant: 'terminal-mono' },
    'surface.card': { variant: 'faceted-console' },
    'collection.exercise': { variant: 'command-rows' },
    'action.primary': { variant: 'command-rail' },
    'chart.progress': { variant: 'telemetry-columns', familiarity: 'expressive' },
  },
};
