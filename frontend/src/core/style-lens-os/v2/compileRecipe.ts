/**
 * RECIPE COMPILER — deterministic (recipe, manifest) -> ResolvedLensPlan.
 * Fail-closed on: structural invalidity, missing required host slots,
 * non-allowlisted variants/templates. Optional slots the host lacks are
 * DROPPED with a recorded degradation, never guessed. Same inputs
 * always produce a deep-equal plan (no clocks, no randomness).
 */
import {
  CONTAINER_PROFILES,
  type ContainerProfile,
  type RecipeIssue,
  type RecipeSlot,
  type RecipeV2,
  validateRecipeV2,
} from './recipeV2';
import {
  hostSupportsTemplate,
  hostSupportsVariant,
  type HostCapabilityManifest,
} from './hostCapabilityManifest';

export interface ResolvedLensPlan {
  lensId: string;
  lensVersion: string;
  hostId: string;
  /** css custom properties ready to place on the lens root (name -> value, no leading --) */
  cssVariables: Record<string, string>;
  /** template per profile the host renders (recipe choice or host default 'default') */
  templates: Record<ContainerProfile, string>;
  /** slot -> resolved variant (only slots BOTH sides know) */
  variants: Partial<Record<RecipeSlot, string>>;
  chartFamiliarity: 'conservative' | 'expressive';
  degradations: readonly string[];
  /** F0: normalized atmosphere — present ONLY when the recipe carries a
   *  structurally-valid atmosphere (drop-not-fail law). Key is ABSENT
   *  otherwise, so pre-F0 plans stay byte-identical (zero-delta). */
  atmosphere?: {
    layers: readonly { kind: string; assetId: string; opacity: number; animated: boolean }[];
    stillPoster: { assetId: string };
  };
}

export type CompileResult =
  | { ok: true; plan: ResolvedLensPlan; degradations: readonly string[] }
  | { ok: false; issues: RecipeIssue[] };

export const compileRecipe = (
  recipe: RecipeV2,
  manifest: HostCapabilityManifest,
): CompileResult => {
  // Drop-not-fail law (F0): atmosphere-path issues degrade the atmosphere
  // away; they never hard-fail an otherwise-sound recipe.
  const allIssues = validateRecipeV2(recipe);
  const issues = allIssues.filter(
    ({ path }) => !(path === 'atmosphere' || path.startsWith('atmosphere.')),
  );
  const atmosphereInvalid = allIssues.length !== issues.length;

  for (const slot of recipe.compatibility.requires) {
    if (!manifest.slots[slot]) {
      issues.push({
        path: `compatibility.requires.${slot}`,
        message: `host ${manifest.hostId} does not provide required slot`,
      });
    }
  }

  const degradations: string[] = [];
  const variants: Partial<Record<RecipeSlot, string>> = {};
  for (const [slotName, choice] of Object.entries(recipe.components)) {
    const slot = slotName as RecipeSlot;
    if (!choice) continue;
    if (!manifest.slots[slot]) {
      if (recipe.compatibility.optional?.includes(slot)) {
        degradations.push(`optional slot ${slot} unsupported by host — dropped`);
        continue;
      }
      issues.push({ path: `components.${slot}`, message: 'host does not provide slot' });
      continue;
    }
    if (!hostSupportsVariant(manifest, slot, choice.variant)) {
      issues.push({
        path: `components.${slot}.variant`,
        message: `variant "${choice.variant}" is not allowlisted by the host`,
      });
      continue;
    }
    variants[slot] = choice.variant;
  }

  const templates = {} as Record<ContainerProfile, string>;
  for (const profile of CONTAINER_PROFILES) {
    const requested = recipe.composition[profile]?.template;
    if (!requested) {
      templates[profile] = 'default';
      continue;
    }
    if (!hostSupportsTemplate(manifest, requested, profile)) {
      issues.push({
        path: `composition.${profile}.template`,
        message: `template "${requested}" is not allowlisted for ${profile}`,
      });
      continue;
    }
    templates[profile] = requested;
  }

  if (issues.length > 0) return { ok: false, issues };

  const cssVariables: Record<string, string> = {};
  for (const [name, value] of Object.entries(recipe.tokens).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    cssVariables[`lens2-${name}`] = value;
  }

  if (atmosphereInvalid) degradations.push('atmosphere invalid — dropped');
  const atmosphere =
    recipe.atmosphere && !atmosphereInvalid
      ? {
          layers: recipe.atmosphere.layers.map((layer) => ({
            kind: layer.kind,
            assetId: layer.assetId,
            opacity: layer.opacity,
            animated: layer.animated === true,
          })),
          stillPoster: { assetId: recipe.atmosphere.stillPoster.assetId },
        }
      : undefined;

  return {
    ok: true,
    degradations,
    plan: {
      lensId: recipe.id,
      lensVersion: recipe.version,
      hostId: manifest.hostId,
      cssVariables,
      templates,
      variants,
      chartFamiliarity:
        recipe.components['chart.progress']?.familiarity ?? 'conservative',
      degradations,
      // conditional spread keeps the key ABSENT for pre-F0 recipes (zero-delta)
      ...(atmosphere ? { atmosphere } : {}),
    },
  };
};
