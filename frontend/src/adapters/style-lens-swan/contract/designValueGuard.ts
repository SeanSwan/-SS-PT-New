/**
 * Swan Lens — design-value guard (S1-B / blueprint §4). A validator EXTENSION, never a parallel.
 *
 * Composition law (mirrors the codebase's own invariant in recipeV2.ts — "two fail-closed
 * validators must never disagree on validity"): the composed accept ⟺ `validateRecipeV2`
 * accepts AND the guard accepts. The guard can only NARROW the accept set (it adds Swan design
 * rules — brand palette, contrast, kind formats); it never overrides a base rejection.
 * `validateStyleLensManifest` / `validateAppearanceProfile` are NOT wrapped or edited.
 *
 * Rules R1–R7 run over a per-lens world-role VALUE table (lensValues.types.ts). No `--world-*`
 * is emitted; keys are bare roles, declarations live in CSS files only (R6).
 */
import {
  type RecipeIssue,
  type RecipeV2,
  validateRecipeV2,
} from '../../../core/style-lens-os/v2/recipeV2';
import {
  LENS_WORLD_ROLES,
  type LensWorldRole,
  type LensWorldRoleValues,
} from './lensValues.types';

export interface DesignIssue {
  role: string;
  rule: string;
  message: string;
}

/**
 * Local re-declaration IDENTICAL to recipeV2.ts `TOKEN_VALUE_PATTERN` (not exported by Lane A;
 * see blueprint XP-4). Parity is enforced behaviorally by the AT-2 corpus, not by import.
 */
export const DESIGN_VALUE_PATTERN = /^[a-zA-Z0-9 #%().,+*/'"_-]{1,240}$/;

/** R5 contrast pairs: [foreground role, background role, minimum ratio]. hex6 roles only. */
export const CONTRAST_RULES: ReadonlyArray<readonly [LensWorldRole, LensWorldRole, number]> = [
  ['text', 'bg', 4.5],
  ['text', 'panel', 4.5],
  ['muted', 'panel', 4.5],
  ['accent', 'panel', 3.0],
];

const HEX6 = /^#[0-9a-fA-F]{6}$/;
const LENGTH = /^\d+(\.\d+)?(px|rem)$/;
const PAINT_PREFIX = /^(#|rgb\(|rgba\(|linear-gradient\(|radial-gradient\(|color-mix\(in srgb,|none$)/;

// R2 — the retired palette + injection substrings. Case-insensitive. Whole-word aqua/cyan so
// "Arctic Cyan" prose elsewhere is irrelevant (only role VALUES reach here). The retired hex
// literals are assembled by concatenation so no literal retired string appears in source and the
// repo-wide grep gate (G2) finds zero occurrences anywhere, including this enforcement file (§3.D).
const BANNED_LITERALS = [
  new RegExp('#0a0a' + '1a', 'i'),
  new RegExp('#00ff' + 'ff', 'i'),
  new RegExp('#7851' + 'a9', 'i'),
];
const BANNED_SUBSTR = [/url\(/i, /expression\(/i, /@import/i, /javascript/i];
const BANNED_NAMED = /(?<![\w-])(aqua|cyan)(?![\w-])/i;
const FORBIDDEN_NAMESPACE = [/--console-/, /--world-/, /--lens-/];

// ── WCAG 2.x relative luminance + contrast (sRGB) ────────────────────────────
const channel = (c: number): number => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};
export function relativeLuminance(hex: string): number {
  const m = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(hex);
  if (!m) return NaN;
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h, 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}
export function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  if (Number.isNaN(l1) || Number.isNaN(l2)) return NaN;
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

function validateKind(value: string, kind: string): string | null {
  switch (kind) {
    case 'color':
      return HEX6.test(value) ? null : 'color must be 6-digit hex #rrggbb';
    case 'length':
      return LENGTH.test(value) ? null : 'length must be <number>px|rem';
    case 'paint':
      return PAINT_PREFIX.test(value) ? null : 'paint must be a hex/rgb/gradient/color-mix/none value';
    case 'shadow':
      return (value === 'none' || (/(px|rem)/.test(value) && (/#[0-9a-fA-F]{3,8}/.test(value) || /rgba?\(/.test(value))))
        ? null
        : 'shadow must be a box-shadow (offset/blur lengths + a color) or none';
    default:
      return `unknown value kind "${kind}"`;
  }
}

/**
 * XP-1 — the adapter-owned design rules. Returns [] when the value table is Swan-clean.
 * Pure + deterministic: issues sorted by (role, rule) (R7).
 */
export function validateLensDesignValues(
  manifestId: string,
  values: LensWorldRoleValues,
): DesignIssue[] {
  const issues: DesignIssue[] = [];
  const push = (role: string, rule: string, message: string) => issues.push({ role, rule, message });

  // R1 — presence: all 8 roles.
  for (const role of LENS_WORLD_ROLES) {
    if (!values[role]) push(role, 'R1', `missing required world role "${role}"`);
  }

  for (const role of LENS_WORLD_ROLES) {
    const entry = values[role];
    if (!entry) continue;
    const v = entry.value;

    // R2 — banned palette + injection.
    if (BANNED_LITERALS.some((re) => re.test(v))) push(role, 'R2', 'retired Galaxy-Swan palette literal is banned');
    if (BANNED_NAMED.test(v)) push(role, 'R2', 'named color aqua/cyan (retired neon cyan) is banned');
    if (BANNED_SUBSTR.some((re) => re.test(v))) push(role, 'R2', 'value contains a forbidden token (url/expression/@import/javascript)');

    // R3 — charset parity with TOKEN_VALUE_PATTERN.
    if (!DESIGN_VALUE_PATTERN.test(v)) push(role, 'R3', 'value contains a disallowed character or exceeds 240 chars');

    // R6 — no CSS custom-property namespaces in values.
    if (FORBIDDEN_NAMESPACE.some((re) => re.test(v))) push(role, 'R6', 'value must not reference --console-/--world-/--lens- names');

    // R4 — kind format.
    const kindErr = validateKind(v, entry.kind);
    if (kindErr) push(role, 'R4', kindErr);
  }

  // R5 — contrast (hex6 color roles only; non-hex skipped with a note).
  for (const [fgRole, bgRole, min] of CONTRAST_RULES) {
    const fg = values[fgRole];
    const bg = values[bgRole];
    if (!fg || !bg) continue;
    if (fg.kind !== 'color' || !HEX6.test(fg.value) || bg.kind !== 'color' || !HEX6.test(bg.value)) {
      push(fgRole, 'R5', `contrast vs ${bgRole} skipped: a non-hex role value`);
      continue;
    }
    const ratio = contrastRatio(fg.value, bg.value);
    if (!(ratio >= min)) {
      push(fgRole, 'R5', `contrast vs ${bgRole} is ${ratio.toFixed(2)}:1, below ${min}:1`);
    }
  }

  // R7 — deterministic ordering.
  return issues.sort((a, b) => (a.role === b.role ? a.rule.localeCompare(b.rule) : a.role.localeCompare(b.role)));
}

export interface ComposedValidationResult {
  ok: boolean;
  designIssues: DesignIssue[];
  recipeIssues: RecipeIssue[];
}

/**
 * Composed entry: guard FIRST, short-circuit. When the guard fails, `validateRecipeV2` is NOT
 * called (the composed result carries only design issues). When the guard passes, base issues
 * are returned untouched. Accept ⟺ guard-clean AND base-clean.
 */
export function validateDesignThenRecipe(
  recipe: RecipeV2,
  manifestId: string,
  values: LensWorldRoleValues,
): ComposedValidationResult {
  const designIssues = validateLensDesignValues(manifestId, values);
  if (designIssues.length > 0) {
    return { ok: false, designIssues, recipeIssues: [] };
  }
  const recipeIssues = validateRecipeV2(recipe);
  return { ok: recipeIssues.length === 0, designIssues: [], recipeIssues };
}
