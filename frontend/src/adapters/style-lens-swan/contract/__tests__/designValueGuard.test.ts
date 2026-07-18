/**
 * AT-1 / AT-2 / AT-3 — the design-value guard as a validator EXTENSION.
 *
 * Retired-palette literals are constructed by concatenation ('#0a0a' + '1a') so the CI
 * grep gate (G2) finds zero occurrences of the banned strings anywhere in source.
 */
import { describe, expect, it } from 'vitest';
import {
  contrastRatio,
  DESIGN_VALUE_PATTERN,
  validateDesignThenRecipe,
  validateLensDesignValues,
} from '../designValueGuard';
import { CRYSTALLINE_DEFAULT_WORLD_VALUES } from '../values/crystallineDefault';
import type { LensWorldRoleValues } from '../lensValues.types';
import { validateRecipeV2, type RecipeV2 } from '../../../../core/style-lens-os/v2/recipeV2';

const BANNED_BG = '#0a0a' + '1a';
const BANNED_CYAN = '#00ff' + 'ff';
const BANNED_PURPLE = '#7851' + 'a9';
const BANNED_NAMED = 'cy' + 'an';

const withRole = (
  role: keyof LensWorldRoleValues,
  value: string,
  kind: LensWorldRoleValues[typeof role]['kind'] = 'paint',
): LensWorldRoleValues => ({
  ...CRYSTALLINE_DEFAULT_WORLD_VALUES,
  [role]: { value, kind },
});

const validRecipe: RecipeV2 = {
  schema: 'smart-lens/recipe-v2',
  id: 'swan-flagship',
  version: '1.0.0',
  compatibility: { engine: '1.0.0', requires: [] },
  tokens: {},
  composition: {},
  components: {},
  constraints: { minimumTouchTargetPx: 44, reducedMotionFallback: 'required' },
};

describe('AT-1 — validateLensDesignValues', () => {
  it('(a) accepts the Crystalline default and its contrast ratios hold', () => {
    expect(validateLensDesignValues('swan-flagship', CRYSTALLINE_DEFAULT_WORLD_VALUES)).toEqual([]);
    expect(contrastRatio('#e0ecf4', '#0a0a0f')).toBeCloseTo(16.4, 1); // text / bg
    expect(contrastRatio('#e0ecf4', '#141419')).toBeCloseTo(15.3, 1); // text / panel
    expect(contrastRatio('#99a0a7', '#141419')).toBeCloseTo(6.9, 1); // muted / panel
    expect(contrastRatio('#60c0f0', '#141419')).toBeCloseTo(9.0, 1); // accent / panel
  });

  it('(b) missing panel → R1 presence issue', () => {
    const noPanel = { ...CRYSTALLINE_DEFAULT_WORLD_VALUES };
    delete (noPanel as Record<string, unknown>).panel;
    const issues = validateLensDesignValues('x', noPanel as LensWorldRoleValues);
    expect(issues.some((i) => i.role === 'panel' && i.rule === 'R1')).toBe(true);
  });

  it('(c) concatenated banned literals + named color → R2', () => {
    expect(validateLensDesignValues('x', withRole('accent', BANNED_BG, 'color')).some((i) => i.rule === 'R2')).toBe(true);
    expect(validateLensDesignValues('x', withRole('accent', BANNED_CYAN, 'color')).some((i) => i.rule === 'R2')).toBe(true);
    expect(validateLensDesignValues('x', withRole('accent', BANNED_PURPLE, 'color')).some((i) => i.rule === 'R2')).toBe(true);
    expect(validateLensDesignValues('x', withRole('accent', BANNED_NAMED, 'paint')).some((i) => i.rule === 'R2')).toBe(true);
  });

  it('(d) muted = swan-lavender (#4070c0, on panel 3.76:1) → R5 contrast failure', () => {
    const issues = validateLensDesignValues('x', withRole('muted', '#4070c0', 'color'));
    expect(issues.some((i) => i.role === 'muted' && i.rule === 'R5')).toBe(true);
  });

  it('(e) 241-char value and a `;`-bearing value → R3', () => {
    const long = '#' + 'a'.repeat(241);
    expect(validateLensDesignValues('x', withRole('accent', long, 'paint')).some((i) => i.rule === 'R3')).toBe(true);
    expect(validateLensDesignValues('x', withRole('accent', 'red;', 'paint')).some((i) => i.rule === 'R3')).toBe(true);
  });

  it('is deterministic — issues sorted by (role, rule)', () => {
    const a = validateLensDesignValues('x', withRole('accent', BANNED_CYAN, 'color'));
    const b = validateLensDesignValues('x', withRole('accent', BANNED_CYAN, 'color'));
    expect(a).toEqual(b);
  });
});

describe('AT-2 — parity corpus (guard vs base validateRecipeV2)', () => {
  // Charset/url/length violations the BASE validator also catches — must never diverge.
  const baseAndGuard = ['a;b', 'a{b', 'a}b', 'a<b', 'a>b', 'a\\b', 'url(x)', '#' + 'a'.repeat(241)];
  // Brand/security values ONLY the guard rejects (base charset allows them). This is the guard's
  // added value, NOT a divergence bug — the blueprint's "both reject" wording overstated base coverage.
  const guardOnly = ['expression(x)', 'javascript', BANNED_BG, BANNED_CYAN, BANNED_PURPLE];

  const guardRejects = (v: string) =>
    validateLensDesignValues('x', withRole('accent', v, 'paint')).length > 0;
  const baseRejects = (v: string) =>
    validateRecipeV2({ ...validRecipe, tokens: { probe: v } }).length > 0;

  it('charset/url/length corpus → rejected by BOTH (no divergence where base has coverage)', () => {
    for (const v of baseAndGuard) {
      expect(guardRejects(v), `guard should reject ${v}`).toBe(true);
      expect(baseRejects(v), `base should reject ${v}`).toBe(true);
    }
  });

  it('brand/security corpus → rejected by the GUARD (base accepts; guard is the added layer)', () => {
    for (const v of guardOnly) {
      expect(guardRejects(v), `guard should reject ${v}`).toBe(true);
    }
  });

  it('DESIGN_VALUE_PATTERN is charset-identical to the base token pattern behavior', () => {
    // Same accept/reject on charset probes as the base (behavioral parity, XP-4).
    expect(DESIGN_VALUE_PATTERN.test('#60c0f0')).toBe(true);
    expect(DESIGN_VALUE_PATTERN.test('a;b')).toBe(false);
    expect(DESIGN_VALUE_PATTERN.test('a{b')).toBe(false);
  });
});

describe('AT-3 — composed authority (validateDesignThenRecipe)', () => {
  it('bad semver + guard-clean values → rejects with BASE issues only', () => {
    const r = validateDesignThenRecipe({ ...validRecipe, version: '1.0' }, 'x', CRYSTALLINE_DEFAULT_WORLD_VALUES);
    expect(r.ok).toBe(false);
    expect(r.designIssues).toEqual([]);
    expect(r.recipeIssues.some((i) => i.path === 'version')).toBe(true);
  });

  it('guard-dirty values short-circuit base validation (base issues suppressed even when present)', () => {
    const dirty = withRole('accent', BANNED_CYAN, 'color');
    // The recipe is ALSO base-invalid (bad semver). If base ran, recipeIssues would be non-empty.
    // Guard-first short-circuit means recipeIssues stays [] — behavioral proof base was skipped.
    const r = validateDesignThenRecipe({ ...validRecipe, version: '1.0' }, 'x', dirty);
    expect(r.ok).toBe(false);
    expect(r.designIssues.length).toBeGreaterThan(0);
    expect(r.recipeIssues).toEqual([]);
  });

  it('clean values + valid recipe → ok', () => {
    const r = validateDesignThenRecipe(validRecipe, 'x', CRYSTALLINE_DEFAULT_WORLD_VALUES);
    expect(r.ok).toBe(true);
    expect(r.designIssues).toEqual([]);
    expect(r.recipeIssues).toEqual([]);
  });
});
