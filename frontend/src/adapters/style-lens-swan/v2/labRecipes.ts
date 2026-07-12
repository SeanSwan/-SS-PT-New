/**
 * SWAN ADAPTER v2 — the Workout Design Lab's host manifest + the two
 * Golden Pair recipes. Recipes are pure data: their tokens map 1:1 onto
 * the Lab worlds' `--world-*` variable contract (LensPlanFrame does the
 * `lens2-*` -> `--world-*` mapping); variants switch representations the
 * shared primitives advertise.
 */
import type { HostCapabilityManifest } from '../../../core/style-lens-os/v2/hostCapabilityManifest';
import type { RecipeV2 } from '../../../core/style-lens-os/v2/recipeV2';

export const LAB_HOST_MANIFEST: HostCapabilityManifest = {
  hostId: 'workout-design-lab',
  version: '1.0.0',
  profiles: ['mobile-minimal', 'tablet', 'desktop-enhanced'],
  slots: {
    'text.display': {
      required: true,
      supportedVariants: ['rounded-athletic', 'compact-technical-mono', 'vaulted-editorial'],
    },
    'text.body': {
      required: true,
      supportedVariants: ['soft-sans', 'terminal-mono'],
    },
    'surface.card': {
      required: true,
      supportedVariants: ['floating-candy', 'faceted-console'],
    },
    'collection.exercise': {
      required: true,
      supportedVariants: ['arcade-cards', 'command-rows'],
    },
    'action.primary': {
      required: true,
      supportedVariants: ['glass-dock', 'command-rail'],
    },
    'chart.progress': {
      required: false,
      supportedVariants: ['arcade-meter', 'telemetry-columns'],
    },
  },
  templates: {
    'playfield-stack': {
      supportedProfiles: ['mobile-minimal', 'tablet', 'desktop-enhanced'],
    },
    'operator-grid': {
      supportedProfiles: ['tablet', 'desktop-enhanced'],
    },
  },
};

const SHARED = {
  schema: 'smart-lens/recipe-v2' as const,
  version: '1.0.0',
  compatibility: {
    engine: '^2.0.0',
    requires: [
      'text.display',
      'text.body',
      'surface.card',
      'collection.exercise',
      'action.primary',
    ],
    optional: ['chart.progress'],
  } as RecipeV2['compatibility'],
  constraints: {
    minimumTouchTargetPx: 44,
    reducedMotionFallback: 'required',
  } as RecipeV2['constraints'],
};

/** Playful glass depth, bold action dock, elastic reward energy. */
export const CANDY_GLASS_ARCADE_RECIPE: RecipeV2 = {
  ...SHARED,
  id: 'swan.candy-glass-arcade.v2',
  tokens: {
    'world-title-font': "800 clamp(38px, 5vw, 76px)/1 Sora, sans-serif",
    'world-letter-spacing': '-0.02em',
    'world-panel-radius': '26px',
    'world-row-radius': '22px',
    'world-dial-radius': '50%',
    'world-accent': 'var(--wing-purple, #8b5cf6)',
    'world-action': 'var(--wing-purple, #8b5cf6)',
    'world-panel': 'color-mix(in srgb, #14245a 82%, transparent)',
    'world-row-columns': 'repeat(auto-fit, minmax(150px, 1fr))',
  },
  composition: {
    'desktop-enhanced': { template: 'playfield-stack' },
    'tablet': { template: 'playfield-stack' },
    'mobile-minimal': { template: 'playfield-stack' },
  },
  components: {
    'text.display': { variant: 'rounded-athletic' },
    'text.body': { variant: 'soft-sans' },
    'surface.card': { variant: 'floating-candy' },
    'collection.exercise': { variant: 'arcade-cards' },
    'action.primary': { variant: 'glass-dock' },
    'chart.progress': { variant: 'arcade-meter', familiarity: 'expressive' },
  },
};

/** Compact diagnostic console: mono type, faceted panels, command rail. */
export const PRISM_TERMINAL_RECIPE: RecipeV2 = {
  ...SHARED,
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

export const GOLDEN_PAIR = [CANDY_GLASS_ARCADE_RECIPE, PRISM_TERMINAL_RECIPE] as const;
