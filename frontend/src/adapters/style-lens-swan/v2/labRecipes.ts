/**
 * SWAN ADAPTER v2 — the Workout Design Lab's host manifest + Golden Pair
 * re-exports. The two Golden Pair recipes MOVED to `worlds/recipes/` in Slice 1
 * (World Engine spine); they are re-exported here so every existing importer
 * (`recipeResolution`, `catalogV2Map`, the v2 test suites) keeps resolving the
 * SAME object references — the migration is hash-identical by construction.
 * New world recipes are authored under `worlds/recipes/` + registered in
 * `worlds/registry.ts`, never here.
 */
import type { HostCapabilityManifest } from '../../../core/style-lens-os/v2/hostCapabilityManifest';
import { CANDY_GLASS_ARCADE_RECIPE } from '../worlds/recipes/candy-glass-arcade';
import { PRISM_TERMINAL_RECIPE } from '../worlds/recipes/prism-terminal';

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

export { CANDY_GLASS_ARCADE_RECIPE, PRISM_TERMINAL_RECIPE };

export const GOLDEN_PAIR = [CANDY_GLASS_ARCADE_RECIPE, PRISM_TERMINAL_RECIPE] as const;
