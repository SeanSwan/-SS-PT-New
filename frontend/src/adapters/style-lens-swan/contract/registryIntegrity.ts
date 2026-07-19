/**
 * Swan Lens — registry integrity assertion (S1-B / blueprint §4 XP-2, F5).
 *
 * Dev/CI thrower: verifies every manifest id has exactly one world-values entry (and, when a
 * style allowlist is supplied, exactly one allowlist entry), and that each lens's values pass
 * the design guard. Throws BEFORE any render so a build can never ship a lens that would render
 * inherited garbage (fail-closed FC-1).
 *
 * All inputs are INJECTED — no import guessing about the adapter barrel (blueprint §10.3).
 * `styleAllowlist` is optional so this composes before the S1-C injection allowlist exists.
 */
import { validateLensDesignValues } from './designValueGuard';
import type { LensWorldValuesRegistry } from './lensValues.types';

export function assertLensRegistryIntegrity(
  manifestIds: readonly string[],
  valuesRegistry: LensWorldValuesRegistry,
  styleAllowlist?: Readonly<Record<string, unknown>>,
): void {
  const issues: string[] = [];

  for (const id of manifestIds) {
    const values = valuesRegistry[id];
    if (!values) {
      issues.push(`manifest "${id}" has no world-values entry`);
    } else {
      const designIssues = validateLensDesignValues(id, values);
      if (designIssues.length > 0) {
        issues.push(`manifest "${id}" values rejected (${designIssues[0].rule}: ${designIssues[0].message})`);
      }
    }
    if (styleAllowlist && !Object.prototype.hasOwnProperty.call(styleAllowlist, id)) {
      issues.push(`manifest "${id}" has no style-allowlist entry`);
    }
  }

  // Reverse direction: no orphan entries pointing at a non-existent manifest.
  const known = new Set(manifestIds);
  for (const id of Object.keys(valuesRegistry)) {
    if (!known.has(id)) issues.push(`world-values entry "${id}" has no manifest`);
  }
  if (styleAllowlist) {
    for (const id of Object.keys(styleAllowlist)) {
      if (!known.has(id)) issues.push(`style-allowlist entry "${id}" has no manifest`);
    }
  }

  if (issues.length > 0) {
    throw new Error(`[SwanLens] registry integrity failed: ${issues.length} issue(s) — ${issues[0]}`);
  }
}
