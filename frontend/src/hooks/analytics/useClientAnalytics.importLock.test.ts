/**
 * useClientAnalytics — dormant-hook import tripwire
 * ===================================================
 * Locks `useClientAnalytics` in a dormant state on behalf of the
 * canonical-surface-audit 2026-04-13 (non-default client analytics pass).
 *
 * Regression intent:
 *   This hook at frontend/src/hooks/analytics/useClientAnalytics.ts batches
 *   13 analytics endpoints in parallel, including:
 *     - /api/client/analytics/dashboard
 *     - /api/client/analytics/volume-progression
 *     - /api/client/analytics/frequency
 *     - /api/client/analytics/chart-* (9 charts)
 *
 *   Several of those backend handlers depend on
 *   analyticsService.calculateExerciseTotals, which still uses the same
 *   schema-drifted WorkoutExercise / Set / sessionDate chain that the prior
 *   getPersonalRecords pass migrated off of:
 *     - `workout_exercises` and `sets` have 0 rows in prod
 *     - real per-set data lives in `workout_logs` with different column names
 *     - real date column is `date`, not `sessionDate`
 *
 *   If a future pass imports `useClientAnalytics` into a canonical client
 *   page (e.g. /dashboard/client/progress, /overview), the page will
 *   silently show zero analytics because the underlying service chain
 *   returns empty / catches and swallows the errors. That is a rule-28
 *   claim-to-evidence trap on a canonical surface.
 *
 *   Instead of deleting the dormant hook (repo cleanup is out of scope this
 *   pass), this test converts its dormancy into a tripwire: it grep-scans
 *   frontend/src for any file outside `useClientAnalytics.ts` itself that
 *   imports the hook and fails the build immediately if it finds one.
 *   The next maintainer who tries to wire it into a canonical page will see
 *   this test go red and must first rewire the drifted backend helpers
 *   (calculateExerciseTotals → workout_logs, etc.) before proceeding.
 *
 *   To retire this tripwire, either (a) delete `useClientAnalytics.ts`
 *   after the backend helpers are fixed, or (b) fix the backend helpers
 *   and remove this test file.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, relative, sep } from 'node:path';

// Repo paths — test file lives at frontend/src/hooks/analytics/…
// so frontend/src is two parents up.
const FRONTEND_SRC = resolve(__dirname, '..', '..');
const HOOK_FILE_ABSOLUTE = resolve(__dirname, 'useClientAnalytics.ts');

// Walk frontend/src recursively and return every .ts/.tsx file.
function walk(dir: string, acc: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      // Skip common non-source dirs
      if (entry === 'node_modules' || entry === '.git' || entry === 'dist' || entry === 'build') continue;
      walk(full, acc);
    } else if (st.isFile()) {
      if (/\.(ts|tsx)$/.test(entry)) acc.push(full);
    }
  }
  return acc;
}

// Import patterns — anything resolving to `useClientAnalytics` by path or symbol
const IMPORT_PATTERNS = [
  /from\s+['"][^'"]*useClientAnalytics['"]/,
  /import\s*\(\s*['"][^'"]*useClientAnalytics['"]\s*\)/,
  /require\s*\(\s*['"][^'"]*useClientAnalytics['"]\s*\)/,
  /\bimport\s*\{[^}]*\buseClientAnalytics\b[^}]*\}\s*from/,
];

describe('useClientAnalytics — dormant-hook import tripwire', () => {
  it('has no importers outside of useClientAnalytics.ts itself (dormant hook is a drift time-bomb)', () => {
    const files = walk(FRONTEND_SRC);
    const offenders: string[] = [];

    for (const file of files) {
      // Skip the hook file itself and its own test files
      if (file === HOOK_FILE_ABSOLUTE) continue;
      if (/useClientAnalytics\.(test|spec|importLock)\.(ts|tsx)$/.test(file)) continue;

      let text: string;
      try {
        text = readFileSync(file, 'utf8');
      } catch {
        continue;
      }

      for (const pat of IMPORT_PATTERNS) {
        if (pat.test(text)) {
          offenders.push(relative(FRONTEND_SRC, file).split(sep).join('/'));
          break;
        }
      }
    }

    if (offenders.length > 0) {
      // Fail with a clear message naming every offender + the reason.
      throw new Error(
        `useClientAnalytics is a dormant hook with a schema-drifted backend chain ` +
          `(analyticsService.calculateExerciseTotals against empty workout_exercises/sets + ` +
          `sessionDate drift). Importing it into a canonical client page silently shows ` +
          `zero analytics. Before re-activating, rewire the backend helpers to the real ` +
          `workout_logs data source (see the getPersonalRecords pass from ` +
          `canonical-surface-audit 2026-04-13 as a template).\n\n` +
          `Offending importers:\n  ${offenders.join('\n  ')}`,
      );
    }

    expect(offenders).toEqual([]);
  });
});
