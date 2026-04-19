/**
 * Phase 16 (2026-04-16) — dailyWorkoutFormRoutes writer truthfulness
 * ====================================================================
 * Locks the Phase 16 contract on the PRIMARY client-facing backend
 * writer. Before Phase 16, `dailyWorkoutFormRoutes.mjs:505, :517` used
 * `overallIntensity || 5` in BOTH the WorkoutSession seed and the
 * DailyWorkoutForm.formData blob. Every save without a touched slider
 * fabricated a 5/10 rating into the column the canonical
 * IntensityRpeTrendLine reads.
 *
 * This test file is a **source-text lock** — it asserts the fix is in
 * place without needing to spin up the Express route + full Sequelize
 * mock stack (the route has many external dependencies: Redis, Stripe,
 * gamification MCP, etc.). Behavioral coverage for the same contract
 * lives on `phase16WorkoutLogServiceIntensity.test.mjs` (T2) and the
 * frontend submit-contract behavioral test (T10).
 *
 * Rule-18 sibling-sweep note: the fix target is the POST endpoint
 * block (around line 505-535). Reader null-guards live around
 * line 940-950 and 1450-1460 — locked separately in T5.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROUTE_SOURCE = readFileSync(
  resolve(__dirname, '../../routes/dailyWorkoutFormRoutes.mjs'),
  'utf8',
);

describe('Phase 16 — dailyWorkoutFormRoutes writer is null-honest', () => {
  it('POST writer does NOT use `overallIntensity || 5` fallback', () => {
    // The phantom that the Phase 16 plan explicitly kills.
    expect(ROUTE_SOURCE).not.toMatch(/overallIntensity\s*\|\|\s*5/);
  });

  it('POST writer treats undefined/null intensity symmetrically (persists null)', () => {
    // We expect a guarded expression like:
    //   (overallIntensity === undefined || overallIntensity === null) ? null : overallIntensity
    // Accept either exact form or a ternary with the two equality checks.
    expect(ROUTE_SOURCE).toMatch(/overallIntensity\s*===\s*undefined/);
    expect(ROUTE_SOURCE).toMatch(/overallIntensity\s*===\s*null/);
  });

  it('formData.overallIntensity is conditionally attached, not unconditionally assigned', () => {
    // The key is that `overallIntensity:` is NOT assigned inside the
    // object literal building `formData` — it should be attached
    // conditionally via `if (overallIntensity !== undefined ...)`.
    expect(ROUTE_SOURCE).toMatch(
      /if\s*\(\s*overallIntensity\s*!==\s*undefined\s*&&\s*overallIntensity\s*!==\s*null\s*\)/,
    );
  });

  it('carries a Phase 16 docstring anchoring the null-honest contract', () => {
    expect(ROUTE_SOURCE).toMatch(/Phase 16/i);
  });
});
