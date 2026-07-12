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
}

export type CompileResult =
  | { ok: true; plan: ResolvedLensPlan; degradations: readonly string[] }
  | { ok: false; issues: RecipeIssue[] };

export const compileRecipe = (
  recipe: RecipeV2,
  manifest: HostCapabilityManifest,
): CompileResult => {
  const issues = validateRecipeV2(recipe);

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
    },
  };
};
