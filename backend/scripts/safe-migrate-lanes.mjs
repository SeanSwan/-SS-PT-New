/**
 * Safe-migrate lane classifiers
 * =============================
 * Pure helpers deciding which failure lane a migration takes in
 * scripts/safe-migrate.mjs. Extracted for the 300-line cap and direct unit
 * coverage. See safe-migrate.mjs for the lane policy itself.
 */

// "Already exists" patterns that indicate the migration was already applied
const ALREADY_APPLIED_PATTERNS = [
  /already exists/i,
  /duplicate key value/i,
  /relation .+ already exists/i,
  /column .+ of relation .+ already exists/i,
  /index .+ already exists/i,
  /constraint .+ already exists/i,
  /type .+ already exists/i,
  /violates foreign key constraint/i, // FK refs existing data = table was already set up
];

export function isAlreadyAppliedError(stderr) {
  return ALREADY_APPLIED_PATTERNS.some(p => p.test(stderr));
}

// STRUCTURAL subset of the already-applied family. For DATA-CRITICAL
// migrations only these may route to the skip lane: an FK violation or a
// duplicate-key error is a plausible GENUINE data-backfill failure and must
// never be mistaken for "already applied" (that would re-open the exact
// silent fail-open the data-critical lane exists to eliminate).
const STRUCTURAL_ALREADY_EXISTS_PATTERNS = [
  /relation .+ already exists/i,
  /column .+ already exists/i,
  /index .+ already exists/i,
  /constraint .+ already exists/i,
  /type .+ already exists/i,
  /trigger .+ already exists/i,
  /function .+ already exists/i,
];

export function isStructuralAlreadyExistsError(stderr) {
  return STRUCTURAL_ALREADY_EXISTS_PATTERNS.some(p => p.test(stderr));
}

// DATA-CRITICAL LANE (2026-07-16 hostile-review fix). Data migrations
// (backfills, repairs) must be fail-closed: a genuine failure may NEVER be
// recorded as applied — the invalid rows would persist silently forever,
// because sync({ alter: true }) never runs in production and SequelizeMeta
// says "done". Name a migration with "backfill" or "data-critical" to opt in.
const DATA_CRITICAL_PATTERN = /backfill|data-critical/i;

// Pre-existing files whose names merely CONTAIN "backfill" but are NOT data
// migrations. Halting a fresh-environment replay on these would wedge the
// whole remaining chain for no data-safety gain. New migrations must not be
// added here — name them accurately instead.
const DATA_CRITICAL_EXEMPT = new Set([
  '20260707050000-create-history-backfill-runs.cjs', // CREATE TABLE (schema)
  '20260707030000-run-ces-coverage-backfill.cjs', // content-seeder delegate
]);

export function isDataCriticalMigration(name) {
  const normalized = String(name || '');
  return DATA_CRITICAL_PATTERN.test(normalized) && !DATA_CRITICAL_EXEMPT.has(normalized);
}
