/**
 * SMART LENS RECIPE v2 — schema (phase-1 six-slot discipline).
 * A recipe is DATA: it names allowlisted variants/templates and token
 * values; it can never carry code, selectors, or URLs. The compiler
 * (compileRecipe.ts) is the only consumer; the host renderer maps the
 * resolved plan onto trusted primitives.
 */

export const RECIPE_V2_SLOTS = [
  'text.display',
  'text.body',
  'surface.card',
  'collection.exercise',
  'action.primary',
  'chart.progress',
] as const;

export type RecipeSlot = (typeof RECIPE_V2_SLOTS)[number];

export const CONTAINER_PROFILES = [
  'mobile-minimal',
  'tablet',
  'desktop-enhanced',
] as const;

export type ContainerProfile = (typeof CONTAINER_PROFILES)[number];

export type ChartFamiliarity = 'conservative' | 'expressive';

export interface RecipeTokens {
  /** CSS custom-property values keyed WITHOUT the leading `--`.
   *  Values are validated against a conservative character allowlist —
   *  no url(), no expressions, no semicolons/braces. */
  [tokenName: string]: string;
}

export interface RecipeComponentChoice {
  variant: string;
  /** chart slots only */
  familiarity?: ChartFamiliarity;
}

/** FUSION F0 — atmosphere axis (data-only; assets resolve adapter-side). */
export const ATMOSPHERE_LAYER_KINDS = ['gradient', 'pattern', 'grain'] as const;
export type AtmosphereLayerKind = (typeof ATMOSPHERE_LAYER_KINDS)[number];
export interface AtmosphereLayer {
  kind: AtmosphereLayerKind;
  /** id into the adapter's ATMOSPHERE_ASSET_CATALOG. NEVER a URL. */
  assetId: string;
  /** 0.01–0.12 — restrained product envelope (validator rejects outside). */
  opacity: number;
  /** MARKETING-LANE ONLY (firewall H1): product surfaces render static regardless. */
  animated?: boolean;
}
export interface RecipeAtmosphere {
  /** max 3 total, max 2 animated (M2 caps; product renders 0 animated). */
  layers: readonly AtmosphereLayer[];
  /** REQUIRED zero-motion story — the sole layer under reduced-motion/off. */
  stillPoster: { assetId: string };
}
/** Sanctioned chart token name: recipes MAY carry `world-chart-secondary`;
 *  the chart seam falls back to Swan Wing Purple when absent (F6 contrast-gates it). */
export const CHART_SECONDARY_TOKEN = 'world-chart-secondary';

export interface RecipeV2 {
  schema: 'smart-lens/recipe-v2';
  id: string;
  version: string;
  compatibility: {
    engine: string;
    requires: readonly RecipeSlot[];
    optional?: readonly RecipeSlot[];
  };
  tokens: RecipeTokens;
  composition: Partial<Record<ContainerProfile, { template: string }>>;
  components: Partial<Record<RecipeSlot, RecipeComponentChoice>>;
  /** optional — absent on every pre-F0 recipe (zero-delta law). */
  atmosphere?: RecipeAtmosphere;
  constraints: {
    minimumTouchTargetPx: number;
    reducedMotionFallback: 'required';
  };
}

const ID_PATTERN = /^[a-z][a-z0-9-]{1,64}(\.[a-z][a-z0-9-]{1,64})*$/;
/** Exported so sibling validators (capability manifests) enforce the SAME
 *  rules — two fail-closed validators must never disagree on validity. */
export const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
/** No url(), semicolons, braces, backslashes, angle brackets. Quotes are
 *  allowed for multi-word font family names only — they cannot terminate
 *  a declaration without ; or }. */
const TOKEN_VALUE_PATTERN = /^[a-zA-Z0-9 #%().,+*/'"_-]{1,240}$/;
export const NAME_PATTERN = /^[a-z][a-z0-9-]{1,64}$/;

export interface RecipeIssue {
  path: string;
  message: string;
}

/** Fail-closed structural validation. Returns [] when the recipe is sound. */
export const validateRecipeV2 = (recipe: RecipeV2): RecipeIssue[] => {
  const issues: RecipeIssue[] = [];
  if (recipe.schema !== 'smart-lens/recipe-v2') {
    issues.push({ path: 'schema', message: 'unsupported schema' });
  }
  if (!ID_PATTERN.test(recipe.id)) {
    issues.push({ path: 'id', message: 'invalid id' });
  }
  if (!VERSION_PATTERN.test(recipe.version)) {
    issues.push({ path: 'version', message: 'invalid semver' });
  }
  for (const slot of recipe.compatibility.requires) {
    if (!RECIPE_V2_SLOTS.includes(slot)) {
      issues.push({ path: `compatibility.requires.${slot}`, message: 'unknown slot' });
    }
  }
  for (const [name, value] of Object.entries(recipe.tokens)) {
    if (!/^[a-z][a-z0-9-]{1,64}$/.test(name)) {
      issues.push({ path: `tokens.${name}`, message: 'invalid token name' });
    }
    if (!TOKEN_VALUE_PATTERN.test(value) || /url\s*\(/i.test(value)) {
      issues.push({ path: `tokens.${name}`, message: 'disallowed token value' });
    }
  }
  for (const [profile, choice] of Object.entries(recipe.composition)) {
    if (!CONTAINER_PROFILES.includes(profile as ContainerProfile)) {
      issues.push({ path: `composition.${profile}`, message: 'unknown profile' });
    } else if (!choice || !NAME_PATTERN.test(choice.template)) {
      issues.push({ path: `composition.${profile}.template`, message: 'invalid template name' });
    }
  }
  for (const [slot, choice] of Object.entries(recipe.components)) {
    if (!RECIPE_V2_SLOTS.includes(slot as RecipeSlot)) {
      issues.push({ path: `components.${slot}`, message: 'unknown slot' });
    } else if (!choice || !NAME_PATTERN.test(choice.variant)) {
      issues.push({ path: `components.${slot}.variant`, message: 'invalid variant name' });
    }
  }
  if (recipe.constraints.minimumTouchTargetPx < 44) {
    issues.push({ path: 'constraints.minimumTouchTargetPx', message: 'below the 44px floor' });
  }
  if (recipe.constraints.reducedMotionFallback !== 'required') {
    issues.push({ path: 'constraints.reducedMotionFallback', message: 'must be "required"' });
  }
  if (recipe.atmosphere) issues.push(...validateAtmosphere(recipe.atmosphere));
  return issues;
};

/** F0: atmosphere structural validation. Exported separately so the compiler
 *  can apply the drop-not-fail law (atmosphere issues degrade; they never
 *  hard-fail an otherwise-sound recipe). */
export const validateAtmosphere = (atmosphere: RecipeAtmosphere): RecipeIssue[] => {
  const issues: RecipeIssue[] = [];
  // JSON-seed lane guard (F5): a truthy non-array must degrade, never throw.
  const layers = Array.isArray(atmosphere.layers) ? atmosphere.layers : [];
  if (!Array.isArray(atmosphere.layers) || layers.length > 3) {
    issues.push({ path: 'atmosphere.layers', message: 'max 3 layers' });
  }
  const animated = layers.filter((l) => l.animated === true).length;
  if (animated > 2) {
    issues.push({ path: 'atmosphere.layers.animated', message: 'max 2 animated layers' });
  }
  layers.forEach((layer, index) => {
    if (!ATMOSPHERE_LAYER_KINDS.includes(layer.kind)) {
      issues.push({ path: `atmosphere.layers.${index}.kind`, message: 'unknown layer kind' });
    }
    if (!NAME_PATTERN.test(layer.assetId)) {
      issues.push({ path: `atmosphere.layers.${index}.assetId`, message: 'invalid asset id' });
    }
    if (typeof layer.opacity !== 'number' || layer.opacity < 0.01 || layer.opacity > 0.12) {
      issues.push({ path: `atmosphere.layers.${index}.opacity`, message: 'opacity outside [0.01, 0.12]' });
    }
  });
  if (!atmosphere.stillPoster || !NAME_PATTERN.test(atmosphere.stillPoster.assetId)) {
    issues.push({ path: 'atmosphere.stillPoster', message: 'stillPoster.assetId required' });
  }
  return issues;
};
