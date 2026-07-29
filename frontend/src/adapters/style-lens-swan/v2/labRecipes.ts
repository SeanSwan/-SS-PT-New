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
import {
  actionVariants,
  bodyVariants,
  buildTemplateManifest,
  chartVariants,
  collectionVariants,
  displayVariants,
  surfaceVariants,
} from '../worlds/variantVocabulary';

// Slot/template vocabulary is the single source of truth in variantVocabulary.ts
// (Slice W0) — the Lab host + every surface manifest draw from it so they can
// never drift. Adding a world variant = one line there + its representation CSS.
export const LAB_HOST_MANIFEST: HostCapabilityManifest = {
  hostId: 'workout-design-lab',
  version: '1.0.0',
  profiles: ['mobile-minimal', 'tablet', 'desktop-enhanced'],
  slots: {
    'text.display': { required: true, supportedVariants: displayVariants() },
    'text.body': { required: true, supportedVariants: bodyVariants() },
    'surface.card': { required: true, supportedVariants: surfaceVariants() },
    'collection.exercise': { required: true, supportedVariants: collectionVariants() },
    'action.primary': { required: true, supportedVariants: actionVariants() },
    'chart.progress': { required: false, supportedVariants: chartVariants() },
  },
  templates: buildTemplateManifest(),
};

export { CANDY_GLASS_ARCADE_RECIPE, PRISM_TERMINAL_RECIPE };

export const GOLDEN_PAIR = [CANDY_GLASS_ARCADE_RECIPE, PRISM_TERMINAL_RECIPE] as const;
