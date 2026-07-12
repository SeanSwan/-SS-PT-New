/**
 * HOST CAPABILITY MANIFEST — what a host surface actually supports.
 * The compiler resolves a recipe AGAINST a manifest: unknown variants
 * and templates are rejected (fail-closed), missing REQUIRED slots make
 * the recipe incompatible, missing OPTIONAL slots degrade gracefully.
 */
import type { ContainerProfile, RecipeSlot } from './recipeV2';

export interface HostCapabilityManifest {
  hostId: string;
  version: string;
  slots: Partial<
    Record<
      RecipeSlot,
      {
        required: boolean;
        supportedVariants: readonly string[];
      }
    >
  >;
  templates: Record<string, { supportedProfiles: readonly ContainerProfile[] }>;
  /** Every profile the host renders; recipes may cover a subset. */
  profiles: readonly ContainerProfile[];
}

export const hostSupportsVariant = (
  manifest: HostCapabilityManifest,
  slot: RecipeSlot,
  variant: string,
): boolean => Boolean(manifest.slots[slot]?.supportedVariants.includes(variant));

export const hostSupportsTemplate = (
  manifest: HostCapabilityManifest,
  template: string,
  profile: ContainerProfile,
): boolean =>
  Boolean(manifest.templates[template]?.supportedProfiles.includes(profile));
