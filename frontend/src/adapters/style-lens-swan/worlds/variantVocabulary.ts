/**
 * BLUEPRINT — Variant Vocabulary (Swan adapter · World Engine, Slice W0)
 * =====================================================================
 * The SINGLE source of truth for the component-slot variant names + template
 * names the World Engine understands. The Lab host manifest and all 6 surface
 * manifests import from here, so the "shared vocabulary matches labRecipes"
 * invariant (surfaceManifests.ts header) is now ENFORCED, not hand-synced.
 *
 * WHY THIS EXISTS (the load-bearing Slice-1 finding): distinctness
 * (`whatChanged`/`changedAxisCount`) counts only the 6 VARIANT/TEMPLATE axes —
 * tokens contribute ZERO. With ~2 variants/axis you can only build ~8 pairwise-
 * ≥3-axis-distinct worlds, not 25. Expanding this vocabulary (≥4–5 variants/axis
 * + ≥4 templates) is the math prerequisite for 25 distinct worlds. Adding a
 * variant = one line here + its representation CSS (lens/ + surface-level) +
 * (optionally) a renderer; the manifests pick it up automatically.
 *
 * Variant names are free-form kebab-case (validated by capability-manifest.schema
 * KEBAB_PATTERN + raw-color ban). New variants are additive + Lab-gated (the
 * rollout resolver stays closed) → zero live-user risk. Design discipline: each
 * variant is a real FORM aligned to a world family (Law A: chrome stays Swan).
 */
import { CONTAINER_PROFILES, type ContainerProfile } from '../../../core/style-lens-os/v2/recipeV2';

/** text.display — headline character. */
export const DISPLAY_VARIANTS = [
  'rounded-athletic', // playful (existing)
  'compact-technical-mono', // technical (existing)
  'vaulted-editorial', // luxe (existing)
  'aurora-airy', // atmospheric — light weight, wide tracking
  'monastic-quiet', // calm — restrained, tight
] as const;

/** text.body — reading voice. */
export const BODY_VARIANTS = [
  'soft-sans', // playful/calm (existing)
  'terminal-mono', // technical (existing)
  'humanist-serif', // luxe — editorial serif
  'signal-grotesk', // atmospheric — grotesk sans
] as const;

/** surface.card — the panel/card treatment. */
export const SURFACE_VARIANTS = [
  'floating-candy', // playful (existing)
  'faceted-console', // technical (existing)
  'frosted-vault', // luxe — frosted glass + chrome edge
  'etched-stone', // calm — matte inset
  'lightwell', // atmospheric — soft inner glow
] as const;

/** collection.exercise — how the list of items is arranged. */
export const COLLECTION_VARIANTS = [
  'arcade-cards', // playful (existing)
  'command-rows', // technical (existing)
  'gallery-tiles', // luxe — spacious tiles
  'ledger-strips', // calm/technical — thin ruled strips
  'orbit-nodes', // playful/cosmic — flowing pill nodes
] as const;

/** action.primary — the primary action arrangement. */
export const ACTION_VARIANTS = [
  'glass-dock', // playful (existing)
  'command-rail', // technical (existing)
  'pill-cluster', // playful/calm — centered rounded pills
  'monolith-bar', // luxe/atmospheric — single solid bar
] as const;

/** chart.progress — progress representation (optional slot). */
export const CHART_VARIANTS = [
  'arcade-meter', // playful (existing)
  'telemetry-columns', // technical (existing)
  'ring-gauge', // calm/luxe — circular
  'spark-ribbon', // atmospheric — flowing ribbon
] as const;

/** composition templates → the container profiles each supports. */
export const TEMPLATE_PROFILES: Readonly<Record<string, readonly ContainerProfile[]>> = Object.freeze({
  'playfield-stack': CONTAINER_PROFILES, // all (existing)
  'operator-grid': ['tablet', 'desktop-enhanced'], // (existing)
  'editorial-column': CONTAINER_PROFILES, // luxe/atmospheric — centered column
  'atrium-split': ['tablet', 'desktop-enhanced'], // calm/technical — split panel
});

export const TEMPLATE_NAMES = Object.keys(TEMPLATE_PROFILES);

/** Mutable copies for manifest `supportedVariants` fields (which expect string[]). */
export const displayVariants = (): string[] => [...DISPLAY_VARIANTS];
export const bodyVariants = (): string[] => [...BODY_VARIANTS];
export const surfaceVariants = (): string[] => [...SURFACE_VARIANTS];
export const collectionVariants = (): string[] => [...COLLECTION_VARIANTS];
export const actionVariants = (): string[] => [...ACTION_VARIANTS];
export const chartVariants = (): string[] => [...CHART_VARIANTS];

/** Templates map shaped for a capability manifest's `templates` field. */
export const buildTemplateManifest = (): Record<string, { supportedProfiles: ContainerProfile[] }> =>
  Object.fromEntries(
    Object.entries(TEMPLATE_PROFILES).map(([name, profiles]) => [name, { supportedProfiles: [...profiles] }]),
  );
