/**
 * macroTableDriftGuard
 * ====================
 * Slice 0.2 regression lock (Rule 58 — schema drift, class 2: table-name drift).
 *
 * Three AI read/debate paths queried a NON-EXISTENT PascalCase table "MacroLogs"
 * instead of the canonical snake_case table `daily_macro_logs` (the tableName of
 * the DailyMacroLog model). Every one is wrapped in a fail-soft try/catch, so the
 * macros domain SILENTLY degraded to empty across the whole AI read + debate layer
 * — no error, just permanently-missing nutrition context for the coach AI.
 *
 * This guard reads the three source files and fails if any reintroduces the
 * drifted table name. It is a static-source contract (same style as the repo's
 * other *.truth/contract source-assertion tests) so the whole cluster is locked,
 * including the aiDebateRoutes route handler that has no cheap behavioral seam.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(here, '../..');

const MACRO_QUERY_FILES = [
  'routes/aiDebateRoutes.mjs',
  'services/ai/contextEngine/coachContextEngine.mjs',
  'services/ai/debate/debateClientContextService.mjs',
];

describe('macro table drift guard (Slice 0.2)', () => {
  for (const rel of MACRO_QUERY_FILES) {
    it(`${rel} queries the canonical daily_macro_logs, not the non-existent "MacroLogs"`, () => {
      const src = readFileSync(resolve(backendRoot, rel), 'utf8');
      expect(src).not.toContain('"MacroLogs"');
      expect(src).toMatch(/daily_macro_logs/);
    });
  }
});
