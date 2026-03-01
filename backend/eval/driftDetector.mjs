/**
 * Drift Detector — Phase 9
 * =========================
 * Compares current eval results against a saved baseline snapshot.
 * Pure functions — no side effects except file read in loadBaseline.
 *
 * Volatile fields (timestamp, durationMs) are excluded from comparison
 * since they vary across runs even when logic is unchanged.
 */
import { readFileSync } from 'fs';

/**
 * Load a baseline JSON file.
 * @param {string} baselinePath - Absolute path to baseline JSON
 * @returns {Object|null} Parsed baseline, or null if missing/invalid
 */
export function loadBaseline(baselinePath) {
  try {
    const raw = readFileSync(baselinePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT' || err instanceof SyntaxError) {
      return null;
    }
    throw err;
  }
}

/** Severity levels for drift changes */
const REGRESSION = 'REGRESSION';
const IMPROVEMENT = 'IMPROVEMENT';
const CHANGE = 'CHANGE';

/**
 * Compare current eval report against a baseline.
 * @param {Object} current  - Output of formatJsonReport
 * @param {Object} baseline - Previously saved formatJsonReport output
 * @returns {{ drifted: boolean, changes: Array<{field: string, baseline: *, current: *, severity: string}>, warnings: string[] }}
 */
export function compareDrift(current, baseline) {
  const changes = [];
  const warnings = [];

  // ── Provenance fields (informational CHANGE) ────────────────────────────
  for (const field of ['datasetVersion', 'promptVersion', 'ruleEngineVersion']) {
    if (current[field] !== baseline[field]) {
      changes.push({
        field,
        baseline: baseline[field],
        current: current[field],
        severity: CHANGE,
      });
    }
  }

  // ── Summary fields ──────────────────────────────────────────────────────
  const summaryFields = [
    { key: 'total',               direction: 'none' },
    { key: 'gated',               direction: 'none' },
    { key: 'passed',              direction: 'higher_better' },
    { key: 'failed',              direction: 'lower_better' },
    { key: 'correctnessFailures', direction: 'lower_better' },
    { key: 'knownGaps',           direction: 'none' },
  ];

  for (const { key, direction } of summaryFields) {
    const bVal = baseline.summary?.[key];
    const cVal = current.summary?.[key];
    if (bVal !== cVal) {
      let severity = CHANGE;
      if (direction === 'higher_better') {
        severity = cVal > bVal ? IMPROVEMENT : REGRESSION;
      } else if (direction === 'lower_better') {
        severity = cVal < bVal ? IMPROVEMENT : REGRESSION;
      }
      changes.push({
        field: `summary.${key}`,
        baseline: bVal,
        current: cVal,
        severity,
      });
    }
  }

  // ── Per-category passRate ───────────────────────────────────────────────
  const allCats = new Set([
    ...Object.keys(baseline.categories || {}),
    ...Object.keys(current.categories || {}),
  ]);

  for (const cat of allCats) {
    const bRate = baseline.categories?.[cat]?.passRate;
    const cRate = current.categories?.[cat]?.passRate;
    if (bRate !== undefined && cRate !== undefined && bRate !== cRate) {
      const severity = cRate < bRate ? REGRESSION : IMPROVEMENT;
      changes.push({
        field: `categories.${cat}.passRate`,
        baseline: bRate,
        current: cRate,
        severity,
      });
    } else if (bRate === undefined && cRate !== undefined) {
      changes.push({
        field: `categories.${cat}.passRate`,
        baseline: '(new)',
        current: cRate,
        severity: CHANGE,
      });
    } else if (bRate !== undefined && cRate === undefined) {
      changes.push({
        field: `categories.${cat}.passRate`,
        baseline: bRate,
        current: '(removed)',
        severity: CHANGE,
      });
    }
  }

  // ── Build warnings for regressions ──────────────────────────────────────
  for (const c of changes) {
    if (c.severity === REGRESSION) {
      warnings.push(`REGRESSION: ${c.field} changed from ${c.baseline} to ${c.current}`);
    }
  }

  return {
    drifted: changes.length > 0,
    changes,
    warnings,
  };
}
